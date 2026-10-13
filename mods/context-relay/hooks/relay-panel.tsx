import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { PANE_WIDTH, paneHeight, paneSvg } from './pane-svg'

const PANE = 'context-relay'
const steps = atom({ plugin: 'context-relay', key: 'steps' } as const, [])
const runState = atom({ plugin: 'context-relay', key: 'run' } as const, null)
const isBusy = atom({ plugin: 'context-relay', key: 'isBusy' } as const, false)

const ICON = { wait: '○', run: '…', ok: '✓', fail: '✗' }

/** The side panel a handoff opens: the live progress of its steps, with a Close button once it is over. */
export function registerRelayPanel(on: Parameters<Register>[0]): void {
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const ui = $.ui.resolve(e)
    const run = await read($, runState)
    const list = await read($, steps)
    const busy = await read($, isBusy)
    const { Box, Button, Text } = ui
    const Svg = 'Svg' in ui ? ui.Svg : null

    return (
      <Box flexDirection="column" gap={1}>
        {Svg && run ? (
          <Svg source={paneSvg(list, run)} alt="Handoff progress" width={PANE_WIDTH} height={paneHeight(list, run)} isInteractive />
        ) : (
          list.map(s => (
            <Text key={s.id} dimColor={s.status === 'wait'}>
              {ICON[s.status]} {s.label} {s.detail ?? ''}
            </Text>
          ))
        )}
        {!busy && (
          <Button
            key="close"
            label="Close"
            onPress={async () => {
              await update($, runState, () => null)
              await $.ui.close({ id: PANE })
            }}
          />
        )}
      </Box>
    )
  })
}
