import { expect, mock, test } from 'claude-code/testing'

const SECRET = 'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx'
const MAIL = 'someone@example.com'
const SUMMARY = [
  '# Handoff',
  '## Goal\nMARK_GOAL ship the relay',
  '## Up next\n- MARK_NEXT run the full test',
  '## Locked in\n- MARK_LOCKED temp folder',
  '## Suggested skills\n- code-review',
  `## Shipped\n- done, the key was ${SECRET} and the mail ${MAIL}`,
].join('\n\n')

type Fork = { isAnswered: true; text: string; usage: Record<string, never> } | { isAnswered: false; reason: string }

/** Everything the mod touches outside itself, answered from memory and recorded. */
function world(on: any, options: { fork?: Fork; tempFails?: boolean; openerCode?: number } = {}) {
  const writes: { path: string; text: string }[] = []
  const runs: string[][] = []
  const fork = options.fork ?? { isAnswered: true, text: SUMMARY, usage: {} }
  mock.clock(on)
  on('session.cwd', () => ({ value: 'C:/Dev/proj' }))
  on('session.model', () => ({ value: 'sonnet' }))
  on('session.turns', () => ({ value: 4 }))
  on('session.usage', () => ({ value: { startedAt: 0, context: { percent: 61 }, rateLimits: [] } }))
  on('session.messages', () => ({
    value: [
      { role: 'user', text: `here is my key ${SECRET}` },
      { role: 'assistant', text: 'Which option do you want, A or B?' },
    ],
  }))
  on('model.fork', () => ({ value: fork }))
  on('fs.write', (_$: any, e: any) => {
    // The mod leaves diagnostic traces in the temp folder; they are not handoff files.
    if (!e.path.includes('relay-trace')) writes.push({ path: String(e.path).split(String.fromCharCode(92)).join('/'), text: e.text })

    return { value: undefined }
  })
  on('process.run', (_$: any, e: any) => {
    runs.push([...e.argv])
    const [bin, , , script] = e.argv
    if (bin === 'powershell' && String(script).includes('GetTempPath')) {
      return { value: options.tempFails ? { exitCode: 1, stdout: '', stderr: 'no' } : { exitCode: 0, stdout: 'C:\\Users\\me\\Temp\\\r\n', stderr: '' } }
    }

    return { value: { exitCode: bin === 'rundll32.exe' ? (options.openerCode ?? 0) : 0, stdout: bin === 'powershell' ? 'sent' : '', stderr: '' } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.toast', () => ({ value: undefined }))

  return { writes, runs }
}

const linkOf = (runs: string[][]) => runs.find(r => r[0] === 'rundll32.exe')?.[2] ?? ''

test('a full handoff: summary saved in the temp folder, link opened, message sent, secrets gone', async ($, on) => {
  const { writes, runs } = world(on)
  const out = await $.command.run({ command: 'context-relay' })
  expect(out.text).toBe('The first message was sent.')

  expect(writes).toHaveLength(1)
  expect(writes[0].path).toBe('C:/Users/me/Temp/relais-proj.md')
  expect(writes[0].text).toContain('MARK_NEXT')
  expect(writes[0].text).not.toContain(SECRET)
  expect(writes[0].text).not.toContain(MAIL)

  const link = linkOf(runs)
  expect(link.startsWith('claude://code/new?q=')).toBe(true)
  const prompt = decodeURIComponent(link.slice('claude://code/new?q='.length))
  for (const mark of ['MARK_GOAL', 'MARK_NEXT', 'MARK_LOCKED', 'Which option do you want, A or B?']) expect(prompt).toContain(mark)
  expect(prompt).toContain('C:/Users/me/Temp/relais-proj.md')
  expect(prompt).not.toContain(SECRET)
  expect(link.length).toBeLessThanOrEqual(7100)
})

test('the send script starts before the link is opened, so the new session is caught as it loads', async ($, on) => {
  const { runs } = world(on)
  await $.command.run({ command: 'context-relay' })
  const sender = runs.findIndex(r => r[0] === 'powershell' && !String(r[3]).includes('GetTempPath'))
  const opener = runs.findIndex(r => r[0] === 'rundll32.exe')
  expect(sender).toBeGreaterThanOrEqual(0)
  expect(sender).toBeLessThan(opener)
})

test('when the model cannot summarize: says why, writes nothing, opens nothing', async ($, on) => {
  const { writes, runs } = world(on, { fork: { isAnswered: false, reason: 'api-error' } })
  const out = await $.command.run({ command: 'context-relay' })
  expect(out.text).toContain('Could not summarize')
  expect(writes).toHaveLength(0)
  expect(linkOf(runs)).toBe('')
})

test('when the temp folder is unavailable: falls back to the project and still completes', async ($, on) => {
  const { writes, runs } = world(on, { tempFails: true })
  const out = await $.command.run({ command: 'context-relay' })
  expect(out.text).toBe('The first message was sent.')
  expect(writes[0].path).toBe('C:/Dev/proj/relais.md')
  expect(linkOf(runs).startsWith('claude://code/new?q=')).toBe(true)
})

test('when Windows cannot open the link: reports the failure instead of claiming success', async ($, on) => {
  const { runs } = world(on, { openerCode: 5 })
  const out = await $.command.run({ command: 'context-relay' })
  expect(out.text).toContain('could not open')
  expect(runs.length).toBeGreaterThan(0)
})
