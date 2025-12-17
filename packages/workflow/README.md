# @private-test-org/workflow

Workflow automation tools.

## Install

```sh
pnpm add @private-test-org/workflow
```

## Quick start

```ts
import { generateCommitMessage } from '@private-test-org/workflow';

await generateCommitMessage({
    messageFilePath: '/path/to/.git/COMMIT_EDITMSG',
    repoRoot: '/path/to/repo',
    model: 'gpt-5-codex-mini',
    modelReasoningEffort: 'high',
    debugLog: (...args) => console.log('[debug]', ...args),
});
```

## API

### `generateCommitMessage(options)`

Generates a conventional commit message using OpenAI Codex API based on staged Git changes.

**Parameters:**
- `options.messageFilePath` (required): Path to the Git commit message file (e.g., `.git/COMMIT_EDITMSG`).
- `options.repoRoot` (required): Root directory of the Git repository.
- `options.model` (optional): OpenAI Codex model name. Defaults to `'gpt-5-codex-mini'`.
- `options.modelReasoningEffort` (optional): Reasoning effort level. Defaults to `'high'`.
- `options.debugLog` (optional): Debug logging function. Called with `(...args: unknown[]) => void`.

**Returns:** `Promise<void>`

**Behavior:**
- Reads staged Git changes (files and diff).
- Skips generation if the commit message file already contains user content.
- Skips generation if there are no staged files.
- Generates a conventional commit message following the [Conventional Commits](https://www.conventionalcommits.org/) specification.
- Writes the generated message to the specified file path.
- Throws an error if Codex API is unavailable (caller should handle gracefully).

### `getStagedChanges(repoRoot, debugLog?)`

Retrieves staged Git changes from the repository.

**Parameters:**
- `repoRoot` (required): Root directory of the Git repository.
- `debugLog` (optional): Debug logging function.

**Returns:** `Promise<StagedChanges>` where `StagedChanges` is:
```ts
{
    files: string[];
    diff: string;
}
```

### Types and Schemas

- `CommitMessage`: TypeScript type for the commit message model.
- `CommitMessageModelSchema`: Zod schema for validating commit messages.
- `CommitMessageJsonSchema`: JSON Schema for OpenAI Codex structured output.
- `GenerateCommitMessageOptions`: Options interface for `generateCommitMessage`.
- `StagedChanges`: Interface for staged Git changes.

## Commit Message Format

Generated commit messages follow the Conventional Commits specification:

```
<type>(<scope>): <subject>

<body>
- bullet point 1
- bullet point 2

<footer>
```

**Types:** `build`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`

**Scope:** Optional, typically a package name or component (e.g., `core`, `parser`, `cli`).

**Subject:** Imperative mood, no trailing period.

**Body:** Bullet list of changes (automatically formatted with `- ` prefix).

**Footer:** Optional, only for breaking changes (format: `BREAKING CHANGE: <details>`).

## Notes

- Requires `@openai/codex-sdk` and `zod` as dependencies.
- Requires OpenAI API credentials to be configured (via environment or SDK defaults).
- The commit message header length is automatically enforced based on `commitlint.config.mjs` rules (defaults to 100 characters).
- Large diffs (>120,000 characters) are automatically truncated.
- The function gracefully handles missing API keys or API failures by throwing an error that should be caught by the caller.
