import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { accentOf, barSvg, formatCost, formatReset, toGauges } from './gauge'

const gauges = atom({ plugin: 'usage-bars', key: 'gauges' } as const, null)
const cost = atom({ plugin: 'usage-bars', key: 'cost' } as const, null)
const BAR_WIDTH = 88
const BAR_HEIGHT = 10
// The layout counts character cells (~8px each), not pixels: reserve them.
const BAR_CELLS = Math.ceil(BAR_WIDTH / 8)
const TRACK = '#2a2e3f'

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    await update($, gauges, () => toGauges(e))
    await update($, cost, () => e.cost?.usd ?? null)
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface === 'terminal') return next(e)

    const usage = await $.session.usage()
    const items = (await read($, gauges)) ?? toGauges(usage)
    const spent = (await read($, cost)) ?? usage.cost?.usd ?? null
    const now = await $.clock.now()
    const { Box, Text, Svg } = $.ui.resolve(e)

    return (
      <Box gap={2} paddingX={1} alignItems="center">
        {items.map(g => {
          const reset = formatReset(g.resetsAt, now)
          return (
            <Box key={g.label} gap={1} alignItems="center">
              <Text dimColor>{g.label}</Text>
              <Box width={BAR_CELLS} flexShrink={0}>
                <Svg
                  source={barSvg(g, BAR_WIDTH, BAR_HEIGHT, TRACK)}
                  alt={`${g.label} ${Math.round(g.percent)}%`}
                  width={BAR_WIDTH}
                  height={BAR_HEIGHT}
                />
              </Box>
              <Text bold color={accentOf(g)}>{Math.round(g.percent)}%</Text>
              {g.detail ? <Text dimColor>{g.detail}</Text> : null}
              {reset ? <Text dimColor>↻{reset}</Text> : null}
            </Box>
          )
        })}
        {spent !== null ? (
          <Box key="cost" gap={1}>
            <Text dimColor>spent</Text>
            <Text bold color="#cbb68c">{formatCost(spent)}</Text>
          </Box>
        ) : null}
      </Box>
    )
  })
}
