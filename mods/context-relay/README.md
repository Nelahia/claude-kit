# context-relay

Hands a long conversation over to a fresh Claude Desktop session, when you choose.

- A **Relay** button sits above the prompt, beside the usage bars. One click starts the handoff.
- The model writes a short summary (Goal, Up next, Locked in, Suggested skills, Shipped). It points to specs, issues and commits instead of copying them, and leaves out secrets and personal data.
- The full summary is saved in the OS temp folder (`relais-<folder>.md`). A new session opens with the summary and the end of the old chat already typed, and the first message is sent for you.
- A side panel shows the progress of each step while it runs.

## Command

- `/context-relay`: run the handoff from the prompt.

## Option

- `openInFolder` (default false): open the new session in the same folder (the app asks to trust it, so it is slower).

Windows only: the first message is sent with a PowerShell UI Automation script. The deep link carries at most about 7000 encoded characters: the summary is cut first (Shipped goes first), then the last messages.
