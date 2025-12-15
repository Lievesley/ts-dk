# {{name}}

{{description}}

## Install

```sh
pnpm add {{name}}
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
} from '{{name}}';

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
- `consoleLogWriter(options, ...args)`: write formatted logs to stderr.
- `fileLogWriter(filePath)`: create a writer that appends formatted logs to a file (falls back to console on error).
- `FilteredLogger`: supports `addFilter(filter)`, `removeFilter(handle)`, `clearFilters()`, and `stop()`.
- `createLoggerRegistry()`, `LoggerRegistry`: build and manage custom registries (advanced).
- Filters: `selectedLevelsLogFilter(levels)`, `minLevelLogFilter(minLevel)`, `componentsLogFilter(components)`, `envLogFilter(envVar)`.

## Filtering

- Level filtering: choose explicit levels or set a minimum level.
- Component filtering: pass `components` to only allow those component names; omit/empty array allows all.

## Notes

- Logs are ISO 8601 timestamps with level and optional `[component]`.
- File sink appends to the provided path; ensure the process has write access.
