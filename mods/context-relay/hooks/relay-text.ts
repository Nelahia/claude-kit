// Words that only thank or acknowledge: a message made of nothing else says nothing about the work.
const SMALL_TALK =
  /\b(?:merci(?: beaucoup)?|thanks?|thank you|good|great|nice|perfect|parfait|super|top|cool|nickel|g[ée]nial|bravo|avec plaisir|de rien|you'?re welcome|np)\b/gi

/** True for a message that is only thanks or acknowledgement ("good merci", "Thanks!"). */
export const isSmallTalk = (text: string): boolean => text.replace(SMALL_TALK, '').replace(/[\s\p{P}\p{S}]+/gu, '') === ''

/** `[a.html](a.html)` becomes `a.html`; `[docs](https://x)` becomes `docs (https://x)`: the same information in fewer characters. */
export const unlink = (text: string): string =>
  text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, target: string) => (label === target ? label : `${label} (${target})`))
