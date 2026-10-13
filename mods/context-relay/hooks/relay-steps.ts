import type { RelayStep } from '../types'

export const STEPS: RelayStep[] = [
  { id: 'read', label: 'Read this session', status: 'wait' },
  { id: 'sum', label: 'Summarize the conversation', status: 'wait' },
  { id: 'file', label: 'Save the handoff', status: 'wait' },
  { id: 'launch', label: 'Open a new session', status: 'wait' },
  { id: 'send', label: 'Send the first message', status: 'wait' },
]

export const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`

const hash = (text: string) => {
  let h = 5381
  for (const c of text) h = ((h * 33) ^ c.codePointAt(0)!) >>> 0

  return h.toString(36)
}

/** A file-name-safe key for the project: its folder name plus a hash of the full path, so two projects named alike never share a file. */
export const safeName = (cwd: string) => {
  const name = (cwd.split(/[\\/]/).filter(Boolean).pop() ?? 'session').replace(/[^\p{L}\p{N}._-]+/gu, '_')

  return `${name}-${hash(cwd.replace(/\\/g, '/').toLowerCase())}`
}
