# @private-test-org/debug

Lightweight logging utilities for Node.js with level and component filtering, console/file sinks, and simple composition helpers.

## Highlights

- Registry-based logging with pluggable writers and filters.
- Global helpers for simple apps plus factory to create isolated registries.
- Built-in console and file writers; file writer auto-falls back to console on errors.
- Composable filters for components, explicit levels, minimum level, environment flags, and custom predicates.

## Install

```sh
pnpm add @private-test-org/debug
```

## Quick start

```ts
import {
    LogLevel,
    consoleLogWriter,
    fileLogWriter,
    log,
    startLogger,
    resetLoggers,
} from '@private-test-org/debug';

// Start a console logger with a minimum level
startLogger({
    logWriter: consoleLogWriter,
    minLevel: LogLevel.INFO,
});

// Start a file logger for WARN/ERROR and selected components
startLogger({
    logWriter: fileLogWriter('/tmp/app.log'),
    levels: [LogLevel.WARN, LogLevel.ERROR],
    components: ['api', 'worker'],
});

log({ level: LogLevel.INFO }, 'Server started on %s', port);
log({ level: LogLevel.WARN, component: 'api' }, 'Slow response for %s', route);
```

## API

- `LogLevel`: enum for TRACE/DEBUG/INFO/WARN/ERROR.
- `log(options, ...args)`: fan-out to all active loggers; `options` supports `level` and optional `component`.
- `startLogger(config)`: register a logger with writer, levels/minLevel, components, filters, and mode (`all`/`any`). Returns a `FilteredLogger`.
- `resetLoggers()`: clears all active loggers from the default registry.
- `createLoggerRegistry()`: build isolated registries for tests or multi-tenant apps.
- `LoggerRegistry`: instance with `startLogger`, `log`, and `reset`.
- `FilteredLogger`: supports `addFilter(filter)`, `removeFilter(handle)`, `clearFilters()`, and `stop()`.
- Writers: `consoleLogWriter(options, ...args)`, `fileLogWriter(filePath)`.
- Filters: `selectedLevelsLogFilter(levels)`, `minLevelLogFilter(minLevel)`, `componentsLogFilter(components)`, `envLogFilter(envVar)`, plus any custom `(options) => boolean`.

## Filtering

- Level filtering: choose explicit levels or set a minimum level.
- Component filtering: pass `components` to only allow those component names; omit/empty array allows all.
- Mode handling: use `mode: 'all'` (default) to require every filter, or `mode: 'any'` to allow when at least one filter passes.
- Environment gating: combine with `envLogFilter('ENV_VAR')` to enable logs only when a flag is set.
- Custom predicates: add your own `(options) => boolean` filter for business rules.

```ts
import { componentsLogFilter, createLoggerRegistry, envLogFilter, LogLevel, minLevelLogFilter } from '@private-test-org/debug';

const registry = createLoggerRegistry();
const logger = registry.startLogger({
    logWriter: consoleLogWriter,
    mode: 'all',
    filters: [
        minLevelLogFilter(LogLevel.INFO),
        componentsLogFilter(['api', 'worker']),
        envLogFilter('ENABLE_VERBOSE_LOGS'),
    ],
});

logger.log({ level: LogLevel.INFO, component: 'api' }, 'Only logs when env flag is set');
```

## Notes

- Logs are ISO 8601 timestamps with level and optional `[component]`.
- File sink appends to the provided path and falls back to console on write errors (first failure is reported once).
- `resetLoggers` clears the default registry; use `createLoggerRegistry` for isolated logger sets (e.g., tests or multi-tenant apps).
- For deterministic tests, create a fresh registry and attach spies to custom writers.
