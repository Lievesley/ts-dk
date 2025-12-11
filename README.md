# Node.js Package Template

A modern, opinionated TypeScript template for creating production-ready Node.js packages and CLI tools.

## Features

- **TypeScript 5.9** - Full type safety with ES2022 target
- **ESM Modules** - Modern ES module format
- **esbuild** - Lightning-fast bundling with source maps
- **Vitest** - Fast unit testing with coverage support
- **ESLint + Prettier** - Consistent code quality and formatting
- **Husky + lint-staged** - Pre-commit hooks for quality gates
- **Commitlint** - Enforced conventional commit messages
- **TypeDoc** - Automatic documentation generation
- **Path Aliases** - Clean imports with `#/*` syntax
- **EditorConfig** - Consistent editor settings across teams
- **VS Code settings** - Preconfigured workspace settings for linting, formatting, and file visibility
- **AI-ready with Cursor** - Built-in Cursor rules and `/commands` for assisted workflows
- **Debug & Benchmarks** - `temp/` scratch space and benchmark suite for experimentation

## Project Structure

```
.
├── src/
│   ├── libA/             # Base math utilities
│   ├── libB/             # Calculator utilities (depends on libA)
│   ├── libC/             # Messaging utilities
│   └── main.ts           # CLI / example entry point
├── test/                 # Test files
├── temp/                 # Temporary debug / scratch scripts
├── dist/esm/             # Compiled output (ESM)
├── esbuild.config.mjs    # Build configuration
├── tsconfig.base.json    # Base TypeScript config
├── tsconfig.build.json   # Build-specific TypeScript config
├── tsconfig.json         # Development TypeScript config
└── vitest.config.ts      # Test configuration
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 10+

### Installation

```bash
# Install dependencies
pnpm install

# Set up git hooks
pnpm prepare
```

### Development

```bash
# Run tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run tests with coverage
pnpm run test:coverage

# Lint code
pnpm run lint

# Fix linting issues
pnpm run lint-fix
```

## Build System

The template uses a custom esbuild configuration with two build modes:

### Compile

Compiles TypeScript to JavaScript and generates type declarations:

```bash
pnpm run compile
```

This runs:
1. **esbuild** - Bundles source code with minification and source maps
2. **tsc** - Generates `.d.ts` type declaration files

### Full Build

Creates a publishable package in `dist/esm`:

```bash
pnpm run build
```

This runs:
1. Clean `dist` directory
2. Compile code
3. Copy `README.md` 
4. Prepare `package.json` for publishing

Output structure:
```
dist/esm/
├── libA.js             # Library A bundle
├── libB.js             # Library B bundle
├── libC.js             # Library C bundle
├── main.js             # CLI / example bundle
├── libA/               # Library A type declarations
├── libB/               # Library B type declarations
├── libC/               # Library C type declarations
├── README.md           # Documentation
└── package.json        # Publishable manifest
```

## Configuration

### TypeScript Path Aliases

Import from `src/*` using the `#/*` alias:

```typescript
import { calculate } from '#/libB';
```

Configure in `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "#/*": ["src/*"]
    }
  }
}
```

### Build Configuration

The `esbuild.config.mjs` script exposes a flexible `build()` helper used by the build pipeline:

```javascript
// Build a library entry point
await build({
    entryPoint: 'src/index.ts',
    libName: 'index',
    plugins: [tsConfigPathsPlugin],
    external: dependencies,
});

// Build the CLI tool with a shebang added at build time
await build({
    entryPoint: 'src/main.ts',
    plugins: [indexPlugin, tsConfigPathsPlugin],
    external: dependencies,
    banner: {
        js: '#!/usr/bin/env node',
    },
});
```

### Code Quality

- **ESLint** - Configured with TypeScript, Prettier, and import plugins
- **Prettier** - 4-space indentation, Unix line endings
- **EditorConfig** - Consistent formatting across editors
- **Commitlint** - Enforces Angular commit convention
- **License headers** - Automatically enforced and added via ESLint during linting

## Scripts

| Script | Description |
|--------|-------------|
| `pnpm run compile` | Compile TypeScript to JavaScript |
| `pnpm run build` | Full build for publishing |
| `pnpm test` | Run tests |
| `pnpm run test:coverage` | Run tests with coverage |
| `pnpm run test:bench` | Run benchmarks |
| `pnpm run lint` | Lint code |
| `pnpm run lint-fix` | Fix linting issues |
| `pnpm run build-docs` | Generate documentation |

## Testing

Tests are written with Vitest and use the same path aliases as source code:

```typescript
import { describe, it, expect } from 'vitest';
import { greet } from '#/libC';

describe('greet', () => {
    it('should return greeting', () => {
        expect(greet('World')).toBe('Hello, World!');
    });
});
```

### Coverage thresholds

See `vitest.config.ts` for coverage configuration and thresholds.

## Publishing

1. Update version in `package.json`
2. Run full build: `pnpm run build`
3. Publish from `dist/esm`: `cd dist/esm && npm publish`

## License

ISC
