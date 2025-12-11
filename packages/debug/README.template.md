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
    logMessage,
    startConsoleLogWriterWithMinLevel,
    startFileLogWriterWithLevels,
} from '{{name}}';

startConsoleLogWriterWithMinLevel(LogLevel.INFO);
startFileLogWriterWithLevels('/tmp/app.log', [LogLevel.WARN, LogLevel.ERROR], ['api', 'worker']);

logMessage({ level: LogLevel.INFO }, 'Server started on %s', port);
logMessage({ level: LogLevel.WARN, component: 'api' }, 'Slow response for %s', route);
```

## API

- `LogLevel`: enum for TRACE/DEBUG/INFO/WARN/ERROR.
- `logMessage(options, ...args)`: fan-out to active sinks; `options` supports `level` and optional `component`.
- `startConsoleLogWriterWithMinLevel(minLevel, components?)`: console writer with minimum level and optional component allowlist.
- `startConsoleLogWriterWithLevels(levels, components?)`: console writer for explicit levels.
- `startFileLogWriterWithMinLevel(filePath, minLevel, components?)`: file writer with minimum level.
- `startFileLogWriterWithLevels(filePath, levels, components?)`: file writer for explicit levels.
- `createFilteredLogWriter({ levelFilter, componentFilter, logWriter })`: build a custom writer with your own handler.
- `addLogWriter(logWriter)`: register a custom writer built via `createFilteredLogWriter`.
- `resetLogWriters()`: clears all active writers.

## Filtering

- Level filtering: choose explicit levels or set a minimum level.
- Component filtering: pass `components` to only allow those component names; omit/empty array allows all.

## Notes

- Logs are ISO 8601 timestamps with level and optional `[component]`.
- File sink appends to the provided path; ensure the process has write access.
