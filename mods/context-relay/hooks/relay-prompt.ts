export const RELAY_FILE = 'relais.md'
export const RESUME_MARK = 'You are continuing a previous session'

// Encoded characters the prompt may take inside the claude:// deep link.
const LINK_BUDGET = 7000
const TAIL_MESSAGES = 2
const TAIL_SIZES = [700, 300, 0]
const SUMMARY_FLOOR = 1500

// Shipped comes last on purpose: when the prompt must be cut, the cut falls on the least useful part.
export const RELAY_PROMPT = `Summarize this conversation so a fresh session can pick it up without losing anything.
Answer ONLY in English markdown, with exactly these five sections, in this order:

# Handoff

## Goal
(what this conversation is for, in 1 to 3 sentences)

## Up next
(bullet list, in order, the next action first)

## Locked in
(bullet list of decisions made and why, not to be reopened)

## Suggested skills
(skills the next session should invoke, one per line with a few words on why; write "none" if no skill applies)

## Shipped
(bullet list of what is finished, with file paths when useful)

Rules:
- Keep the whole answer under 2500 characters.
- Do not copy what already lives in a spec, plan, issue, commit or diff: point to it by path or URL instead.
- Never include secrets or personal data (passwords, tokens, API keys, emails, phone numbers, addresses). Write "[redacted]" if one is needed to make sense.
- Be concise and factual. Invent nothing.`

const flat = (t: string) => t.replace(/\s+/g, ' ').trim()
const head = (t: string, n: number) => (t.length > n ? `${t.slice(0, n)}…` : t)
const tailOf = (t: string, n: number) => (t.length > n ? `…${t.slice(-n)}` : t)
const cost = (t: string) => encodeURIComponent(t).length

/**
 * The prompt that opens the new session: handoff, end of the old chat, then the ask.
 * Sized by its encoded length, since spaces, newlines and accents all swell in a URL. The end of
 * each message is kept (that is where the open question is) and the summary is cut from the back.
 */
export const buildResume = (
  handoff: string,
  history: { role: string; text: string }[],
  cwd: string,
  file: string,
): string => {
  const messages = history.filter(m => m.text && m.text.trim() !== '').slice(-TAIL_MESSAGES)
  const compose = (summaryMax: number, tailMax: number): string =>
    [
      `${RESUME_MARK}. Previous working folder: ${cwd}. The full handoff is also saved at ${file}.`,
      head(handoff, summaryMax),
      tailMax > 0
        ? `End of the previous conversation:\n\n${messages.map(m => `[${m.role}] ${tailOf(flat(m.text), tailMax)}`).join('\n\n')}`
        : '',
      'Summarize Goal and Up next in two lines, then continue from Up next.',
    ]
      .filter(Boolean)
      .join('\n\n')

  // Cut the summary first (down to a floor), then the messages, so the open question is the last thing to go.
  let text = ''
  for (const tailMax of TAIL_SIZES) {
    let summaryMax = handoff.length
    text = compose(summaryMax, tailMax)
    while (summaryMax > SUMMARY_FLOOR && cost(text) > LINK_BUDGET) {
      summaryMax = Math.max(SUMMARY_FLOOR, Math.floor(summaryMax * 0.85))
      text = compose(summaryMax, tailMax)
    }
    if (cost(text) <= LINK_BUDGET) return text
  }

  return text
}
