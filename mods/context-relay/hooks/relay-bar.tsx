import type { Register } from 'claude-code'

/** An "Open relay" button beside whatever else draws above the prompt (the usage bars). */
export function registerRelayBar(on: Parameters<Register>[0], pane: string): void {
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || e.surface === 'terminal') return next(e)
    const others = await next(e)
    const { Box, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column" gap={1}>
        <Box paddingX={1}>
          <Button key="open" label="⤳  Open relay" onPress={() => $.ui.open({ id: pane, title: 'Context relay' })} />
        </Box>
        {others}
      </Box>
    )
  })
}
