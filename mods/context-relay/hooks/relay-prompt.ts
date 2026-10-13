export const RELAY_FILE = 'relais.md'

export const RELAY_PROMPT = `Summarize this conversation so a fresh session can pick it up without losing anything.
Answer ONLY in English markdown, with exactly these four sections:

# Handoff

## Goal
(what this conversation is for, in 1 to 3 sentences)

## Shipped
(bullet list of what is finished, with file paths when useful)

## Up next
(bullet list, in order, the next action first)

## Locked in
(bullet list of decisions made and why, not to be reopened)

Be concise and factual. Invent nothing.`

export const RESUME_PROMPT = `Read ${RELAY_FILE} in this folder. It is the handoff of the previous session. Summarize Goal and Up next in two lines, then continue from Up next.`

const SUMMARY_MAX = 3500
const MESSAGE_MAX = 700
const plain = (t: string) => t.replace(/[*`]/g, '').replace(/\s+/g, ' ').trim()
const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t)

/** The prompt that opens the new session: handoff, end of the old chat, then the ask. */
export const buildResume = (
  handoff: string,
  history: { role: string; text: string }[],
  cwd: string,
): string => {
  const tail = history
    .filter(m => m.text && m.text.trim() !== '')
    .slice(-2)
    .map(m => `[${m.role}] ${clip(plain(m.text), MESSAGE_MAX)}`)
    .join('\n\n')

  return [
    `${RESUME_MARK}. Previous working folder: ${cwd}. Its handoff is also saved there as ${RELAY_FILE}.`,
    clip(handoff, SUMMARY_MAX),
    `End of the previous conversation:\n\n${tail}`,
    'Summarize Goal and Up next in two lines, then continue from Up next.',
  ].join('\n\n')
}

export const RESUME_MARK = 'You are continuing a previous session'
