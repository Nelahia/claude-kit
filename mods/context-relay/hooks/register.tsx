import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { RelayRun, RelayStep } from '../types'
import { PANE_WIDTH, paneHeight, paneSvg } from './pane-svg'
import { registerRelayBar } from './relay-bar'
import { RELAY_FILE, RELAY_PROMPT, buildResume } from './relay-prompt'
import { sendScript } from './send-script'

const PANE = 'context-relay'
const percent = atom({ plugin: 'context-relay', key: 'percent' } as const, 0)
const limit = atom({ plugin: 'context-relay', key: 'limit' } as const, null)
const isHidden = atom({ plugin: 'context-relay', key: 'isHidden' } as const, false)
const isBusy = atom({ plugin: 'context-relay', key: 'isBusy' } as const, false)
const steps = atom({ plugin: 'context-relay', key: 'steps' } as const, [])
const runState = atom({ plugin: 'context-relay', key: 'run' } as const, null)
const summary = atom({ plugin: 'context-relay', key: 'summary' } as const, null)

const STEPS: RelayStep[] = [
  { id: 'read', label: 'Read this session', status: 'wait' },
  { id: 'sum', label: 'Summarize the conversation', status: 'wait' },
  { id: 'file', label: `Save ${RELAY_FILE}`, status: 'wait' },
  { id: 'launch', label: 'Open a new session', status: 'wait' },
  { id: 'send', label: 'Send the first message', status: 'wait' },
]

/** The threshold in force: the one chosen in this session, else the plugin option. */
async function effective($: any, fallback: number): Promise<number> {
  return (await read($, limit)) ?? fallback
}

/** Applies a new threshold at once (the options are only read at load), keeps it, and re-arms the offer. */
async function setLimit($: any, value: number): Promise<void> {
  await update($, limit, () => value)
  await update($, isHidden, () => false)
  await $.config.set({ key: 'context-relay.threshold', value })
  await $.ui.toast(`Relay will be offered at ${value}%`)
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`

/** Prepares the summary right after a turn so the button does not wait for the model. */
async function prepare($: any): Promise<void> {
  const turn: number = await $.session.turns()
  const current = await read($, summary)
  if (current && current.turn === turn) return
  const reply = await $.model.fork({ prompt: RELAY_PROMPT })
  if (reply.isAnswered) await update($, summary, () => ({ text: reply.text.trim(), turn }))
}

async function mark($: any, id: string, status: RelayStep['status'], detail?: string) {
  const now: number = await $.clock.now()
  await update($, steps, (list: RelayStep[]) =>
    list.map(s =>
      s.id !== id
        ? s
        : {
            ...s,
            status,
            detail,
            startedAt: status === 'run' ? now : s.startedAt,
            endedAt: status === 'run' ? undefined : now,
          },
    ),
  )
}

async function patchRun($: any, patch: Partial<RelayRun>) {
  await update($, runState, (cur: RelayRun | null) => ({ ...(cur ?? { startedAt: 0 }), ...patch }))
}

async function finish($: any, ok: boolean, result: string): Promise<string> {
  await patchRun($, { ok, result, endedAt: await $.clock.now() })

  return result
}

/** Live handoff: summary, file, then a new session started from the app's deep link. */
async function relay($: any, withFolder: boolean): Promise<string> {
  if (await read($, isBusy)) return 'A handoff is already running.'
  await update($, isBusy, () => true)
  await update($, steps, () => STEPS)
  await update($, runState, () => ({ startedAt: 0 }))
  await patchRun($, { startedAt: await $.clock.now() })
  await $.ui.open({ id: PANE, title: 'Context relay' })
  try {
    await mark($, 'read', 'run')
    const cwd: string = await $.session.cwd()
    const model: string = await $.session.model()
    const { context } = await $.session.usage()
    await patchRun($, { cwd, model, percent: context.percent ?? 0 })
    await mark($, 'read', 'ok', 'Folder, model and context size')

    await mark($, 'sum', 'run')
    const t0: number = await $.clock.now()
    const cached = await read($, summary)
    let handoff = ''
    if (cached && cached.turn === (await $.session.turns())) {
      handoff = cached.text
      await mark($, 'sum', 'ok', 'Prepared in advance')
    } else {
      const reply = await $.model.fork({ prompt: RELAY_PROMPT })
      if (!reply.isAnswered) {
        await mark($, 'sum', 'fail', reply.reason)
        return await finish($, false, `Could not summarize: ${reply.reason}`)
      }
      handoff = reply.text.trim()
      await mark($, 'sum', 'ok', `Written by the model in ${secs((await $.clock.now()) - t0)}`)
    }

    await mark($, 'file', 'run')
    await $.fs.write(`${cwd}/${RELAY_FILE}`, `${handoff}\n`)
    await mark($, 'file', 'ok', `${cwd}/${RELAY_FILE}`)

    await mark($, 'launch', 'run')
    const history: { role: string; text: string }[] = await $.session.messages()
    const resume = buildResume(handoff, history, cwd)
    // The `folder` parameter makes the app ask to trust the folder, which slows the send.
    const folder = withFolder ? `folder=${encodeURIComponent(cwd.replace(/\//g, '\\'))}&` : ''
    const link = `claude://code/new?${folder}q=${encodeURIComponent(resume)}`
    await mark($, 'send', 'run')
    // The sender starts first so PowerShell's startup overlaps with the new session loading.
    const sending = $.process.run(['powershell', '-NoProfile', '-Command', sendScript(`${cwd}/.relay-send.log`)], {
      cwd,
      timeoutMs: 40000,
    })
    const opened = await $.process.run(['rundll32.exe', 'url.dll,FileProtocolHandler', link], {
      cwd,
      timeoutMs: 15000,
    })
    if (opened.exitCode !== 0) {
      await mark($, 'launch', 'fail', `Windows error ${opened.exitCode}`)
      return await finish($, false, 'Windows could not open the Claude link.')
    }
    await mark($, 'launch', 'ok', 'Handoff and last 2 messages in the prompt')

    const sent = (await sending).stdout.includes('sent')
    await mark($, 'send', sent ? 'ok' : 'fail', sent ? 'Message sent' : 'Claude did not take focus')

    return await finish($, sent, sent ? 'The first message was sent.' : 'Press Enter in the new session.')
  } catch (error) {
    return await finish($, false, String(error))
  } finally {
    await update($, isBusy, () => false)
  }
}

export const register: Register = (on, options) => {
  const fallback = Number(options.threshold ?? 60)
  const withFolder = options.openInFolder === true

  registerRelayBar(on, PANE)

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'context-relay', description: 'Hand this conversation to a new session' })
    await $.command.register({ name: 'relay-threshold', description: 'Open the relay panel, or set the context % that offers it' })
    // The panel is there from the start; its own close button hides it.
    await $.ui.open({ id: PANE, title: 'Context relay' })

    return next(e)
  })

  on('command.run', { command: 'context-relay' }, async $ => ({ text: await relay($, withFolder) }))

  on('command.run', { command: 'relay-threshold' }, async ($, e) => {
    const value = Number(e.args.trim())
    if (e.args.trim() === '') {
      await update($, runState, () => null)
      await $.ui.open({ id: PANE, title: 'Context relay' })

      return { text: `Relay panel opened. Offered at ${await effective($, fallback)}% of context.` }
    }
    if (!Number.isFinite(value) || value < 1 || value > 99) return { text: 'Usage: /relay-threshold 60' }
    // Offer again right away: show the panel now (setLimit rearms the once-per-crossing offer).
    await update($, runState, () => null)
    await $.ui.open({ id: PANE, title: 'Context relay' })
    await setLimit($, value)

    return { text: `Threshold set to ${value}%. The relay panel is open.` }
  })

  on('turn.complete', async ($, e, next) => {
    const { context } = await $.session.usage()
    const pct = context.percent ?? 0
    await update($, percent, () => pct)
    if (pct < (await effective($, fallback))) {
      await update($, isHidden, () => false)

      return next(e)
    }
    void prepare($)
    // Offer the handoff once each time the context crosses the threshold.
    if (!(await read($, isHidden)) && !(await read($, isBusy))) {
      await update($, isHidden, () => true)
      await update($, runState, () => null)
      await $.ui.open({ id: PANE, title: 'Context relay' })
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const list = await read($, steps)
    const run = await read($, runState)
    const current = (await $.session.usage()).context.percent ?? (await read($, percent))
    const busy = await read($, isBusy)
    const threshold = await effective($, fallback)
    const { Box, Button, Text } = ui
    const Svg = 'Svg' in ui ? ui.Svg : null
    const Input = 'Input' in ui ? ui.Input : null

    if (run === null) {
      return (
        <Box flexDirection="column" gap={1} padding={1}>
          <Text bold>
            Offered at {threshold}% · context {current}%
          </Text>
          <Box gap={1}>
            <Button key="go" variant="primary" label="Hand off now" onPress={async () => $.ui.toast(await relay($, withFolder))} />
            <Button key="later" label="Close" onPress={() => $.ui.close({ id: PANE })} />
          </Box>
          <Text dimColor>Offer at</Text>
          <Box gap={1} flexWrap="wrap">
            {[40, 50, 60, 70, 80].map(level => (
              <Button
                key={`level-${level}`}
                label={`${level}%`}
                variant={level === threshold ? 'primary' : 'secondary'}
                onPress={() => setLimit($, level)}
              />
            ))}
          </Box>
          {Input ? (
            <Box paddingBottom={1}>
              <Input
                key="custom"
                label="Other %"
                placeholder="1 to 99, Enter"
                submitLabel="set"
                onSubmit={value => {
                  const n = Math.round(Number(value))
                  if (n >= 1 && n <= 99) setLimit($, n)
                  else $.ui.toast('Enter a number from 1 to 99')
                }}
              />
            </Box>
          ) : null}
        </Box>
      )
    }

    const icon = { wait: '○', run: '…', ok: '✓', fail: '✗' }

    return (
      <Box flexDirection="column" gap={1}>
        {Svg ? (
          <Svg source={paneSvg(list, run)} alt="Handoff progress" width={PANE_WIDTH} height={paneHeight(list, run)} isInteractive />
        ) : (
          list.map(s => (
            <Text key={s.id} dimColor={s.status === 'wait'}>
              {icon[s.status]} {s.label} {s.detail ?? ''}
            </Text>
          ))
        )}
        {!busy && (
          <Button
            key="close"
            label="Close"
            onPress={async () => {
              await update($, runState, () => null)
              await $.ui.close({ id: PANE })
            }}
          />
        )}
      </Box>
    )
  })
}
