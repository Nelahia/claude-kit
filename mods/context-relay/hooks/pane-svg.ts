import type { RelayRun, RelayStep } from '../types'

export const PANE_WIDTH = 520
const W = PANE_WIDTH
const PAD = 8
const ROW = 64
const PITCH = 74
const TOP = 118
const ACCENT = '#6d5efc'
const GREEN = '#17b26a'
const RED = '#f04438'

const CSS =
  '.card{fill:#f5f6f9;stroke:#e2e5ec}.ink{fill:#14141a}.mute{fill:#6b6f7a}.track{fill:#dcdfe6}' +
  '.ring{fill:none;stroke:#c4c8d2}' +
  '@media (prefers-color-scheme:dark){.card{fill:#1e1e23;stroke:#2c2c34}.ink{fill:#f3f3f6}' +
  '.mute{fill:#9a9ca7}.track{fill:#34343d}.ring{stroke:#4b4b56}}' +
  "text{font-family:system-ui,'Segoe UI',sans-serif}.mono{font-family:ui-monospace,Consolas,monospace}"

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t)
const sec = (ms: number) => `${(ms / 1000).toFixed(1)}s`
const mark = (d: string, extra = '') =>
  `<path d="${d}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" ${extra}/>`

const icon = (status: RelayStep['status'], cx: number, cy: number): string => {
  const at = `transform="translate(${cx} ${cy})"`
  if (status === 'ok') return `<circle cx="${cx}" cy="${cy}" r="14" fill="${GREEN}"/>${mark('M-5 .5l3.5 3.5L6 -4', at)}`
  if (status === 'fail') return `<circle cx="${cx}" cy="${cy}" r="14" fill="${RED}"/>${mark('M-4.5 -4.5l9 9M4.5 -4.5l-9 9', at)}`
  if (status === 'wait') return `<circle cx="${cx}" cy="${cy}" r="11" class="ring" stroke-width="2"/>`

  return (
    `<circle cx="${cx}" cy="${cy}" r="11" class="ring" stroke-width="3"/>` +
    `<circle cx="${cx}" cy="${cy}" r="11" fill="none" stroke="${ACCENT}" stroke-width="3" stroke-linecap="round" stroke-dasharray="26 44">` +
    `<animateTransform attributeName="transform" type="rotate" from="0 ${cx} ${cy}" to="360 ${cx} ${cy}" dur="0.9s" repeatCount="indefinite"/></circle>`
  )
}

const row = (s: RelayStep, i: number): string => {
  const y = TOP + i * PITCH
  const took = s.startedAt !== undefined && s.endedAt !== undefined ? sec(s.endedAt - s.startedAt) : s.status === 'run' ? '…' : ''
  const edge = s.status === 'run' ? `stroke="${ACCENT}" stroke-width="1.5"` : 'stroke-width="1"'

  return `<g${s.status === 'wait' ? ' opacity=".55"' : ''}>
<rect class="card" x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="${ROW}" rx="14" ${edge}/>${icon(s.status, PAD + 34, y + ROW / 2)}
<text class="ink" x="72" y="${y + 27}" font-size="15" font-weight="600">${esc(s.label)}</text>
<text class="mute" x="72" y="${y + 47}" font-size="12.5">${esc(cut(s.detail ?? '', 64))}</text>
<text class="mute mono" x="${W - PAD - 18}" y="${y + 27}" font-size="12" text-anchor="end">${took}</text></g>`
}

const bar = (steps: RelayStep[]): string => {
  const w = (W - 2 * PAD - 6 * (steps.length - 1)) / steps.length

  return steps
    .map((s, i) => {
      const fill = s.status === 'ok' ? GREEN : s.status === 'fail' ? RED : s.status === 'run' ? ACCENT : ''
      const anim = s.status === 'run' ? '<animate attributeName="opacity" values="1;.35;1" dur="1.2s" repeatCount="indefinite"/>' : ''

      return `<rect class="${fill ? '' : 'track'}" ${fill ? `fill="${fill}"` : ''} x="${PAD + i * (w + 6)}" y="88" width="${w}" height="6" rx="3">${anim}</rect>`
    })
    .join('')
}

const header = (run: RelayRun | null): string => {
  const done = run?.endedAt !== undefined
  const tone = !done ? ACCENT : run?.ok ? GREEN : RED
  const label = !done ? 'Working…' : `${run?.ok ? 'Done' : 'Failed'} · ${sec((run?.endedAt ?? 0) - (run?.startedAt ?? 0))}`

  return `<text class="ink" x="${PAD}" y="30" font-size="22" font-weight="700">Handoff</text>
<text class="mute" x="${PAD}" y="52" font-size="12.5">${esc(run?.model ?? '…')} · ${run?.percent ?? '–'}% context</text>
<text class="mute mono" x="${PAD}" y="70" font-size="11.5">${esc(cut(run?.cwd ?? '', 60))}</text>
<rect x="${W - PAD - 124}" y="12" width="124" height="28" rx="14" fill="${tone}" fill-opacity=".15"/>
<text x="${W - PAD - 62}" y="31" font-size="12.5" font-weight="600" text-anchor="middle" fill="${tone}">${esc(label)}</text>`
}

const footer = (run: RelayRun | null, y: number): string => {
  if (!run?.result) return ''
  const tone = run.ok ? GREEN : RED

  return `<rect x="${PAD}" y="${y}" width="${W - 2 * PAD}" height="62" rx="14" fill="${tone}" fill-opacity=".12" stroke="${tone}" stroke-opacity=".4"/>
<text class="ink" x="${PAD + 18}" y="${y + 26}" font-size="14.5" font-weight="600">${run.ok ? 'New session is running' : 'Handoff stopped'}</text>
<text class="mute" x="${PAD + 18}" y="${y + 46}" font-size="12.5">${esc(cut(run.result, 70))}</text>`
}

/** Height of the drawing, so the surface can be given its size explicitly. */
export const paneHeight = (steps: RelayStep[], run: RelayRun | null): number =>
  TOP + steps.length * PITCH + (run?.result ? 78 : 12)

/** The handoff panel as one vector drawing: header, progress bar, step cards, result. */
export const paneSvg = (steps: RelayStep[], run: RelayRun | null): string => {
  const end = TOP + steps.length * PITCH
  const height = paneHeight(steps, run)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${height}" width="${W}" height="${height}"><style>${CSS}</style>${header(run)}${bar(steps)}${steps.map(row).join('')}${footer(run, end + 6)}</svg>`
}
