---
name: session-handoff
description: Prepares and exports the technical context of the current session to a handoff.md file at the project root, so a fresh session can pick the work up. Use when the user asks for "the handoff", "a handoff", "a session transition", or invokes /session-handoff.
---

# Session Handoff

Run autonomously, without asking for confirmation. An optional argument says what the next session
will focus on: when given, shape the handoff around it.

1. Read the recent history of the session, the files changed, and the state of the tests.
2. Create (or overwrite) `handoff.md` at the project root, following the template below exactly.
3. Fill it in as tersely as possible: bullet points, no introductory sentences.

## Rules

- **Do not copy what already lives elsewhere.** If a spec, plan, ADR, issue, commit or diff already
  records something, point to it by path or URL instead of repeating it.
- **Never include secrets or personal data** (passwords, tokens, API keys, emails, phone numbers,
  addresses). Write `[redacted]` where one is needed to make sense of the text.
- **Name the skills the next session should invoke** in the "Suggested skills" section, with a few
  words on why. Write "none" when no skill applies.
- Put the **exact next action first** in "Immediate next steps": the file to open and what to do.
- Say what is **not** verified. A test that was not run is "not tested", never "validated".

## Template of `handoff.md`

```markdown
# 🔄 CLAUDE CODE - SESSION HANDOFF

## 🎯 Main goal
- [Final goal of the task in progress]

## 🛠️ Current state & files changed
- **Files touched:** `path/file1.ext`, `path/file2.ext`
- **Recent changes:** [What was just done]
- **Test status:** [🟢 Passing / 🔴 Failing (give the error message) / 🟡 Not tested]

## 🚧 Blockers & things to watch
- [Bug in progress, odd behavior, or technical constraint to keep in mind]

## ⏭️ Immediate next steps
1. [EXACT action to take when opening session B, and the target file]
2. [Following step]

## 🧰 Suggested skills
- [skill name: why it helps next, or "none"]

---
*Session transition file. Session B: do the work, then delete this file once it is absorbed.*
```
