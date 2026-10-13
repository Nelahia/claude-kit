export type RelayStep = {
  id: string
  label: string
  status: 'wait' | 'run' | 'ok' | 'fail'
  detail?: string
  startedAt?: number
  endedAt?: number
}

export type RelayRun = {
  startedAt: number
  endedAt?: number
  model?: string
  percent?: number
  cwd?: string
  ok?: boolean
  result?: string
}

export type RelaySummary = { text: string; turn: number }

declare module 'claude-code' {
  interface PluginState {
    'context-relay': {
      percent: number
      limit: number | null
      isHidden: boolean
      isBusy: boolean
      steps: RelayStep[]
      run: RelayRun | null
      summary: RelaySummary | null
    }
  }
}
