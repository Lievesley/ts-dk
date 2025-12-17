# @private-test-org/utils

General-purpose utility functions for TypeScript/Node.js.

## Install

```sh
pnpm add @private-test-org/utils
```

## Quick start

```ts
import { dynamicImport } from '@private-test-org/utils';

// Load a module (Node.js caches imports, so multiple calls only load once)
const mod = await dynamicImport('@private-test-org/debug');
if (mod) {
    // Use the module
}
```

## API

### `dynamicImport(moduleName)`

Dynamically imports a module and returns the result. Node.js caches ES module imports, so calling this multiple times for the same module will only load the module once.

**Parameters:**
- `moduleName` (required): The module name to import (string).

**Returns:** `Promise<unknown | null>` - The imported module or `null` if the import fails.

**Behavior:**
- Returns the imported module on success.
- Returns `null` if the import fails (instead of throwing).
- Node.js caches ES module imports, so multiple calls for the same module share the same module instance.
- Safe for concurrent calls - Node.js handles deduplication.

**Example:**

```ts
import { dynamicImport } from '@private-test-org/utils';

// Load a module
const mod = await dynamicImport('my-module');
if (mod) {
    mod.doSomething();
}

// Multiple concurrent calls are safe
const [mod1, mod2, mod3] = await Promise.all([
    dynamicImport('my-module'),
    dynamicImport('my-module'),
    dynamicImport('my-module'),
]); // Module is only loaded once by Node.js, all resolve to the same instance
```
