const MASK = '[redacted]'

// Each pattern matches one family of secret or personal data. Order matters: the long blocks go first.
const PATTERNS: RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
  /\b[a-z][a-z0-9+.-]*:\/\/[^\s:@/]+:[^\s@/]+@/gi,
  /\bsk-[A-Za-z0-9_-]{16,}/g,
  /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{30,}/g,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/gi,
  // A password or secret is masked from 4 characters; a token or key from 8, never a call like getToken().
  /\b(?:password|passwd|pwd|secret)\b["']?\s*[:=]\s*["']?[^\s"',;]{4,}["']?/gi,
  /\b(?:token|api[_-]?key|access[_-]?key)\b["']?\s*[:=]\s*["']?[^\s"',;()]{8,}(?!\()["']?/gi,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g,
]

/** Replaces secrets and personal data (keys, tokens, passwords, credentials in URLs, e-mails) with a mask. */
export const redact = (text: string): string => PATTERNS.reduce((out, pattern) => out.replace(pattern, MASK), text)
