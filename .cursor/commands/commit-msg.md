# Create a commit message

1. Ensure the scratch directory exists: `mkdir -p temp`
2. Execute `git --no-pager diff --staged >temp/commit-message-diff.txt` (staged changes only; leave unstaged edits untouched).
3. Generate a commit message from the file `temp/commit-message-diff.txt` in this EXACT format and output it **inside a fenced `text` code block**:
```text
<type>([<scope>]): <subject>
\n
- <body bullet point 1>
- <body bullet point 2>
- ...
- <body bullet point N>
\n
<footer>
```
   - Example footer for breaking changes (Angular format required by `@commitlint/config-angular`):
```text
BREAKING CHANGE: drop Node 16 support
```
4. Delete `temp/commit-message-diff.txt` after displaying the commit message.

RULES:
- All rules MUST follow the configuration defined in file `./commitlint.config.mjs`
- Before outputting, verify the header ≤ max length defined in file `./commitlint.config.mjs`
  - If NO: apply the AUTO-SHORTEN CHECKLIST below, then re-check. Only output when YES.
- `<type>`: `build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`
- `<scope>`: optional; if used, prefer a meaningful scope like `core`, `parser`, `cli`, `docs`, `deps`
- `<subject>`: imperative mood with no trailing period
- `<body>`: MUST be a bullet list (each line starts with "- ")
- `<footer>`: Only for breaking changes: "BREAKING CHANGE: `<details>`"

AUTO-SHORTEN CHECKLIST (apply in order until header ≤ max length):
- Drop scope entirely.
- Shorten subject: remove filler words (`the`, `and`, `of`), replace phrases with single verbs, use shorter synonyms (`update`→`bump`, `remove`→`drop`, `configure`→`set`).
- Trim modifiers: delete adverbs/adjectives (`significantly`, `legacy`, `minor`).
- Abbreviate obvious nouns (`configuration`→`config`, `dependency/ies`→`deps`).

PRE-OUTPUT VALIDATION:
- Before outputting, verify that the commit message fully complies with the rules in `./commitlint.config.mjs`
- If the message does not comply, shorten, rephrase, or adjust it until it does.
- Only output the commit message once all rules are satisfied.

**NEVER** OUTPUT ANY EXPLANATORY TEXT BEFORE OR AFTER THE COMMIT MESSAGE:
❌ "Based on the git diff, I can see the changes"
❌ "Let me generate a commit message:"
❌ Any explanatory text before or after the fenced code block

CORRECT OUTPUT:
✅ Commit message ONLY
