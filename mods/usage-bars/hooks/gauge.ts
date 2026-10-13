import type { Gauge } from '../types'

type Usage = {
  context: { percent?: number; tokens?: number; window: number }
  rateLimits: { kind: string; percentUsed: number; resetsAt?: string }[]
  cost?: { usd: number }
}

const LABELS: Record<string, string> = { five_hour: '5h', seven_day: '7d', spend_limit: 'spend' }

// Gradient start/end per gauge; any gauge past 85% turns to the hot palette.
const PALETTES: Record<string, [string, string]> = {
  context: ['#5a7ca3', '#86a3c7'],
  '5h': ['#8379ab', '#a89ec8'],
  '7d': ['#5f9488', '#8fb8aa'],
  spend: ['#a89166', '#cbb68c'],
}
const HOT: [string, string] = ['#c58a5c', '#c3665f']

const compact = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : `${n}`)

// Context always; subscription windows when the account reports them. Without
// any window (API key), the context bar also carries its token counts.
export const toGauges = (u: Usage): Gauge[] => {
  const windows = u.rateLimits.filter(r => LABELS[r.kind])
  const detail =
    windows.length === 0 && u.context.tokens !== undefined
      ? `${compact(u.context.tokens)}/${compact(u.context.window)}`
      : undefined
  return [
    { label: 'context', percent: u.context.percent ?? 0, detail },
    ...windows.map(r => ({ label: LABELS[r.kind], percent: r.percentUsed, resetsAt: r.resetsAt })),
  ]
}

export const formatCost = (usd: number) => `$${usd < 10 ? usd.toFixed(2) : usd.toFixed(1)}`

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16)

const mix = (a: string, b: string, t: number) =>
  '#' +
  [0, 1, 2]
    .map(i => Math.round(channel(a, i) + (channel(b, i) - channel(a, i)) * t).toString(16).padStart(2, '0'))
    .join('')

const paletteOf = (g: Gauge) => (g.percent >= 85 ? HOT : (PALETTES[g.label] ?? PALETTES.context))

// One entry per dot: its gradient color when filled, null when empty.
export const dotColors = (g: Gauge, count: number): (string | null)[] => {
  const [from, to] = paletteOf(g)
  const filled = Math.min(count, Math.max(g.percent > 0 ? 1 : 0, Math.round((g.percent / 100) * count)))
  return Array.from({ length: count }, (_, i) =>
    i < filled ? mix(from, to, count > 1 ? i / (count - 1) : 0) : null,
  )
}

// Rounded pill bar: a track, and a gradient fill clipped to the same radius.
export const barSvg = (g: Gauge, width: number, height: number, track: string) => {
  const [from, to] = paletteOf(g)
  const r = height / 2
  const fillW = g.percent > 0 ? Math.max(height, (Math.min(100, g.percent) / 100) * width) : 0
  const fill = fillW
    ? `<rect width="${fillW}" height="${height}" rx="${r}" fill="url(#g)"/>`
    : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">` +
    `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="${Math.max(fillW, 1)}" y2="0">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>` +
    `<rect width="${width}" height="${height}" rx="${r}" fill="${track}"/>${fill}</svg>`
  )
}

export const accentOf =(g: Gauge) => paletteOf(g)[1]

export const formatReset = (resetsAt: string | undefined, now: number) => {
  if (!resetsAt) return ''
  const mins = Math.max(0, Math.round((Date.parse(resetsAt) - now) / 60000))
  if (mins >= 2880) return `${Math.round(mins / 1440)}j`
  const h = Math.floor(mins / 60)
  return h ? `${h}h${String(mins % 60).padStart(2, '0')}` : `${mins}min`
}
