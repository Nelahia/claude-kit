import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { RelayRun, RelayStep } from '../types'
import { registerRelayPanel } from './relay-panel'
import { RELAY_FILE, RELAY_PROMPT, buildResume } from './relay-prompt'
import { redact } from './relay-redact'
import { STEPS, safeName, secs } from './relay-steps'
import { sendScript } from './send-script'

// The handoff runs on demand: the panel and the "Open relay" button are the only entry points.
// Helpers that receive `$` live in this entry file; the panel and the bar only draw.
const PANE = 'context-relay'
const steps = atom({ plugin: 'context-relay', key: 'steps' } as const, [])
const runState = atom({ plugin: 'context-relay', key: 'run' } as const, null)
const isBusy = atom({ plugin: 'context-relay', key: 'isBusy' } as const, false)
const tempDir = atom({ plugin: 'context-relay', key: 'tempDir' } as const, null)

/** Temporary diagnostic: leaves a file in the temp folder each time a hook really runs in the app. */
async function trace($: any, label: string): Promise<void> {
  try {
    await $.fs.write(`C:/Users/nelah/AppData/Local/Temp/relay-trace-${label}.txt`, `${await $.clock.now()}\n`)
  } catch {
    // A trace must never break the hook.
  }
}

/** Reads the OS temp folder (once per session; the handoff starts it before the summary). */
async function warmTemp($: any): Promise<void> {
  try {
    const out = await $.process.run(['powershell', '-NoProfile', '-Command', '[IO.Path]::GetTempPath()'], { timeoutMs: 8000 })
    const dir = String(out.stdout).trim().replace(/[\\/]+$/, '')
    if (out.exitCode === 0 && dir !== '') await update($, tempDir, () => dir.replace(/\\/g, '/'))
  } catch {
    // The handoff falls back to the project folder and says so.
  }
}

/** Writes the handoff in the OS temp folder; says so in the step when it had to use the project. */
async function saveHandoff($: any, cwd: string, handoff: string): Promise<{ file: string; note: string }> {
  const dir = await read($, tempDir)
  if (dir) {
    const file = `${dir}/relais-${safeName(cwd)}.md`
    try {
      await $.fs.write(file, `${handoff}\n`)

      return { file, note: '' }
    } catch {
      // Falls through to the project folder.
    }
  }
  const file = `${cwd}/${RELAY_FILE}`
  await $.fs.write(file, `${handoff}\n`)

  return { file, note: ' (temp folder unavailable, saved in the project)' }
}

async function mark($: any, id: string, status: RelayStep['status'], detail?: string) {
  const now: number = await $.clock.now()
  await update($, steps, (list: RelayStep[]) =>
    list.map(s =>
      s.id !== id
        ? s
        : { ...s, status, detail, startedAt: status === 'run' ? now : s.startedAt, endedAt: status === 'run' ? undefined : now },
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

    // The temp folder lookup runs while the model writes the summary, so it costs no extra wait.
    const warming = (await read($, tempDir)) ? Promise.resolve() : warmTemp($)
    await mark($, 'sum', 'run')
    const t0: number = await $.clock.now()
    const reply = await $.model.fork({ prompt: RELAY_PROMPT })
    if (!reply.isAnswered) {
      await mark($, 'sum', 'fail', reply.reason)
      return await finish($, false, `Could not summarize: ${reply.reason}`)
    }
    const handoff: string = redact(reply.text.trim())
    await mark($, 'sum', 'ok', `Written by the model in ${secs((await $.clock.now()) - t0)}`)

    await mark($, 'file', 'run')
    await warming
    const { file, note } = await saveHandoff($, cwd, handoff)
    await mark($, 'file', 'ok', `${file}${note}`)

    await mark($, 'launch', 'run')
    const history: { role: string; text: string }[] = await $.session.messages()
    const resume = buildResume(handoff, history, cwd, file)
    // The `folder` parameter makes the app ask to trust the folder, which slows the send.
    const folder = withFolder ? `folder=${encodeURIComponent(cwd.replace(/\//g, '\\'))}&` : ''
    const link = `claude://code/new?${folder}q=${encodeURIComponent(resume)}`
    await mark($, 'send', 'run')
    // The sender starts first so PowerShell's startup overlaps with the new session loading.
    const sending = $.process.run(['powershell', '-NoProfile', '-Command', sendScript(`${file.replace(/\.md$/, '')}-send.log`)], {
      cwd,
      timeoutMs: 40000,
    })
    const opened = await $.process.run(['rundll32.exe', 'url.dll,FileProtocolHandler', link], { cwd, timeoutMs: 15000 })
    if (opened.exitCode !== 0) {
      await mark($, 'launch', 'fail', `Windows error ${opened.exitCode}`)
      return await finish($, false, 'Windows could not open the Claude link.')
    }
    await mark($, 'launch', 'ok', 'Handoff and end of the chat in the prompt')

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
  const withFolder = options.openInFolder === true

  registerRelayPanel(on)

  on('session.start', async ($, e, next) => {
    await trace($, 'session-start')
    await $.command.register({ name: 'context-relay', description: 'Hand this conversation to a new session' })

    return next(e)
  })

  on('command.run', { command: 'context-relay' }, async $ => {
    await trace($, 'command-run')
    try {
      return { text: await relay($, withFolder) }
    } catch (error) {
      return { text: `Relay failed: ${String(error)}` }
    }
  })

  // The button starts the handoff itself, beside whatever else draws above the prompt (the usage bars).
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface === 'terminal') return next(e)
    const others = await next(e)
    const { Box, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" gap={1}>
        <Box paddingX={1}>
          <Button
            key="relay"
            label="⤳  Relay"
            onPress={async () => {
              await trace($, 'press')
              $.ui.toast(await relay($, withFolder))
            }}
          />
        </Box>
        {others}
      </Box>
    )
  })
}
