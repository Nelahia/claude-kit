import type { RelayStep } from '../types'

export const STEPS: RelayStep[] = [
  { id: 'read', label: 'Read this session', status: 'wait' },
  { id: 'sum', label: 'Summarize the conversation', status: 'wait' },
  { id: 'file', label: 'Save the handoff', status: 'wait' },
  { id: 'launch', label: 'Open a new session', status: 'wait' },
  { id: 'send', label: 'Send the first message', status: 'wait' },
]

export const secs = (ms: number) => `${(ms / 1000).toFixed(1)}s`

/** The project folder's name made safe for a file name (and a PowerShell string). */
export const safeName = (cwd: string) => (cwd.split(/[\\/]/).filter(Boolean).pop() ?? 'session').replace(/[^\w.-]+/g, '_')
