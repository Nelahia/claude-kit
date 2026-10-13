# session-handoff

A skill that writes the technical context of the current session to `handoff.md` at the project root, so a fresh session can resume the work.

Triggers: "do the handoff", `/session-handoff`. Give it an argument to say what the next session will focus on.

The handoff points to specs, issues and commits instead of copying them, masks secrets and personal data, and lists the skills the next session should invoke.

## Install

```
/plugin install session-handoff --marketplace Nelahia/claude-kit
```
