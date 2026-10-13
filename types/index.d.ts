export type Gauge = { label: string; percent: number; resetsAt?: string; detail?: string }

declare module 'claude-code' {
  interface PluginState {
    'usage-bars': { gauges: Gauge[] | null; cost: number | null }
  }
}
