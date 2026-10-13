import { describe, expect, test } from 'claude-code/testing'

import { RELAY_PROMPT, RESUME_MARK, buildResume } from '../hooks/relay-prompt'

const LINK_BUDGET = 7000
const FILE = 'C:/Temp/relais-demo.md'
const QUESTION = 'Which option do you want, A or B?'

// A handoff in the order the prompt asks for, with a marker in every section and a padded Shipped.
const handoffOf = (shippedChars: number): string =>
  [
    '# Handoff',
    '## Goal\nMARK_GOAL build the relay mod',
    '## Up next\n- MARK_NEXT run the full test in a new chat',
    '## Locked in\n- MARK_LOCKED the file goes to the temp folder',
    '## Suggested skills\n- MARK_SKILLS code-review',
    `## Shipped\n${'- item éàù done\n'.repeat(Math.ceil(shippedChars / 16))}MARK_SHIPPED_END`,
  ].join('\n\n')

const chat = [
  { role: 'user', text: 'x '.repeat(900) },
  { role: 'assistant', text: `${'long answer. '.repeat(300)} ${QUESTION}` },
]

describe('the prompt that asks the model for the summary', () => {
  test('asks for the five sections in the order Goal, Up next, Locked in, Suggested skills, Shipped', () => {
    const at = ['## Goal', '## Up next', '## Locked in', '## Suggested skills', '## Shipped'].map(h => RELAY_PROMPT.indexOf(h))
    expect(at.every(i => i >= 0)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })

  test('tells the model to point to artifacts, drop secrets, and stay short', () => {
    expect(RELAY_PROMPT).toContain('point to it by path or URL')
    expect(RELAY_PROMPT).toContain('Never include secrets or personal data')
    expect(RELAY_PROMPT).toContain('under 2500 characters')
  })
})

describe('the prompt that opens the new session, whatever the conversation size', () => {
  for (const size of [100, 2000, 6000, 20000, 100000]) {
    test(`with a ${size}-character Shipped list: fits the link and keeps what matters`, () => {
      const text = buildResume(handoffOf(size), chat, 'C:/proj', FILE)
      expect(encodeURIComponent(text).length).toBeLessThanOrEqual(LINK_BUDGET)
      for (const mark of ['MARK_GOAL', 'MARK_NEXT', 'MARK_LOCKED', 'MARK_SKILLS']) expect(text).toContain(mark)
      expect(text).toContain(RESUME_MARK)
      expect(text).toContain(FILE)
    })
  }

  test('cuts Shipped first: the end of a huge Shipped list is the part that goes', () => {
    const text = buildResume(handoffOf(100000), chat, 'C:/proj', FILE)
    expect(text).not.toContain('MARK_SHIPPED_END')
  })

  test('keeps a small handoff whole, nothing cut', () => {
    const text = buildResume(handoffOf(100), chat, 'C:/proj', FILE)
    expect(text).toContain('MARK_SHIPPED_END')
  })

  test('keeps the end of the last message, where the open question is', () => {
    for (const size of [100, 20000]) {
      expect(buildResume(handoffOf(size), chat, 'C:/proj', FILE)).toContain(QUESTION)
    }
  })

  test('keeps markdown characters of the last messages (globs, code)', () => {
    const text = buildResume(handoffOf(100), [{ role: 'user', text: 'run `**/*.ts` now' }], 'C:/proj', FILE)
    expect(text).toContain('`**/*.ts`')
  })

  test('works with no conversation history at all', () => {
    const text = buildResume(handoffOf(100), [], 'C:/proj', FILE)
    expect(text).toContain('MARK_NEXT')
    expect(text).not.toContain('End of the previous conversation')
  })
})

describe('secrets in the summary and in the last messages', () => {
  const SECRETS = [
    'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWx',
    'ghp_abcdefghijklmnopqrstuvwxyz0123456789',
    'AKIAIOSFODNN7EXAMPLE',
    'xoxb-1234567890-abcdefghij',
    'Bearer abcdefghijklmnopqrstuvwxyz123456',
    'password=hunter2hunter2',
    'postgres://admin:s3cretpass@db.example.com/app',
    'someone@example.com',
  ]

  test('removes every secret from the summary part of the prompt', () => {
    const handoff = `${handoffOf(100)}\n\nNotes: ${SECRETS.join(' and ')}`
    const text = buildResume(handoff, chat, 'C:/proj', FILE)
    for (const secret of SECRETS) expect(text).not.toContain(secret)
    expect(text).toContain('[redacted]')
  })

  test('removes secrets from the last messages, which the model never filters', () => {
    const history = [{ role: 'user', text: `my key is ${SECRETS[0]} and my mail ${SECRETS[7]}` }]
    const text = buildResume(handoffOf(100), history, 'C:/proj', FILE)
    expect(text).not.toContain(SECRETS[0])
    expect(text).not.toContain(SECRETS[7])
  })
})
