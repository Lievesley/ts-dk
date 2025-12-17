// Copyright (c) 2025 TE·AM. All rights reserved.

// Copyright (c) 2025 TE·AM. All rights reserved.

const dbg = await import('@private-test-org/debug').catch(() => null);

const LOG_COMPONENT = 'ts-dk/scripts/generateCommitMessage';

export const LogLevel = dbg?.LogLevel;
export const log = dbg?.createComponentLog?.(LOG_COMPONENT) ?? ((..._args) => {});

export function startLogger() {
    if (dbg?.startLogger && dbg?.consoleLogWriter && dbg?.LogLevel) {
        dbg.startLogger({
            logWriter: dbg.consoleLogWriter,
            mode: 'all',
            minLevel: dbg.LogLevel.DEBUG,
            componentPrefixes: [LOG_COMPONENT, 'ts-dk/workflow'],
            filters: [dbg.envLogFilter('DEBUG')],
        });
    }
}
