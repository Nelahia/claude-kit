import { describe, expect, test } from 'claude-code/testing'

import { redact } from '../hooks/relay-redact'
import { safeName } from '../hooks/relay-steps'

describe('redact', () => {
  test('masks private key blocks whole', () => {
    const block = '-----BEGIN RSA PRIVATE KEY-----\nMIIEabc\ndef\n-----END RSA PRIVATE KEY-----'
    expect(redact(`key:\n${block}\nend`)).toBe('key:\n[redacted]\nend')
  })

  test('masks JWTs, API keys and cloud credentials', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U'
    for (const secret of [jwt, 'sk-proj-AbCdEfGhIjKlMnOp12345', 'github_pat_11ABCDEFG0abcdefghij_klmnop', 'AIzaSyA-1234567890abcdefghijklmnopqrstu']) {
      expect(redact(`use ${secret} here`)).toBe('use [redacted] here')
    }
  })

  test('masks credentials inside a URL but keeps the host', () => {
    expect(redact('mongodb://root:pa55word@db.local:27017/x')).toBe('[redacted]db.local:27017/x')
  })

  test('masks password-like assignments', () => {
    expect(redact('PASSWORD: "hunter22"')).toBe('[redacted]')
    expect(redact('api_key = abcd1234efgh')).toBe('[redacted]')
    expect(redact('token: ghx0123456789abcdef')).toBe('[redacted]')
  })

  test('leaves ordinary text, paths, code and public URLs alone', () => {
    for (const text of [
      'edit C:/Developer/mods/context-relay/hooks/register.tsx at line 42',
      'const token = await getToken()',
      'see https://github.com/Nelahia/claude-kit/tree/main/mods',
      'Up next: run the test and commit',
    ]) {
      expect(redact(text)).toBe(text)
    }
  })

  test('is safe to apply twice', () => {
    const once = redact('mail a@b.co and password=abcdefgh')
    expect(redact(once)).toBe(once)
  })
})

describe('safeName', () => {
  test('turns a folder with quotes and spaces into a file-safe name', () => {
    expect(safeName("C:/Dev/Neal's app")).toBe('Neal_s_app')
    expect(safeName('C:\\Dev\\proj\\')).toBe('proj')
    expect(safeName('')).toBe('session')
  })
})
