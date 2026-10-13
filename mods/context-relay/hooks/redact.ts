const PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?(-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  /\b(?:sk|pk|rk|ghp|gho|ghs|github_pat|xox[abprs]|AKIA|AIza|glpat)[-_A-Za-z0-9]{12,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g,
]
const ASSIGNED = /\b([\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|apikey)[\w.-]*\s*[:=]\s*)(?:"[^"]*"|'[^']*'|\S+)/gi

/** Masks the usual secrets and emails in text that is copied verbatim (the model only redacts its own summary). */
export const redact = (text: string): string =>
  PATTERNS.reduce((t, re) => t.replace(re, '[redacted]'), text).replace(ASSIGNED, '$1[redacted]')
