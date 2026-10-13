# context-relay

Hands a long conversation over to a fresh Claude Desktop session.

- A "Context relay" side panel opens with each conversation and again when the context crosses your threshold.
- **Hand off now** has the model write a summary into `relais.md`, opens a new session with it and the last two messages, and sends the first message.
- The threshold is changed from the panel (chips or any value from 1 to 99) or with `/relay-threshold 70`.
- An **Open relay** button above the prompt reopens the panel; it sits beside the usage bars.

## Commands

- `/context-relay`: run the handoff.
- `/relay-threshold [N]`: open the panel, or set the threshold to N percent.

## Options

- `threshold` (default 60): context percent at which the handoff is offered.
- `openInFolder` (default false): open the new session in the same folder (asks to trust it, slower).

Windows only: the first message is sent with a PowerShell UI Automation script.
