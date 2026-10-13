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

declare module 'claude-code' {
  interface PluginState {
    'context-relay': {
      tempDir: string | null
      isBusy: boolean
      steps: RelayStep[]
      run: RelayRun | null
    }
  }
}
