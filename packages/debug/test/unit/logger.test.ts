// Copyright (c) 2025 TE·AM. All rights reserved.

import * as fs from 'node:fs';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    resetLogWriters,
    componentFilter,
    createFilteredLogWriter,
    levelsFilter,
    logMessage,
    LogLevel,
    startConsoleLogWriterWithLevels,
    startConsoleLogWriterWithMinLevel,
    startFileLogWriterWithLevels,
    startFileLogWriterWithMinLevel,
} from '#/logger';

vi.mock('node:fs', () => ({ appendFileSync: vi.fn() }));

describe('Logger', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        resetLogWriters();
        vi.mocked(fs.appendFileSync).mockReset();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetLogWriters();
    });

    it('logs at or above minLevel', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithMinLevel(LogLevel.INFO);

        // When
        logMessage({ level: LogLevel.DEBUG }, 'no output');
        logMessage({ level: LogLevel.INFO }, 'info output');
        logMessage({ level: LogLevel.ERROR }, 'error output');

        // Then
        expect(errorSpy).toHaveBeenCalledTimes(2);
        expect(errorSpy.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] info output$/);
        expect(errorSpy.mock.calls[1][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[ERROR\] error output$/);

        errorSpy.mockRestore();
    });

    it('logs only matching explicit levels', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithLevels([LogLevel.DEBUG]);

        // When
        logMessage({ level: LogLevel.DEBUG }, 'debug only');
        logMessage({ level: LogLevel.INFO }, 'info skipped');

        // Then
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[DEBUG\] debug only$/);

        errorSpy.mockRestore();
    });

    it('writes to file for allowed explicit levels', () => {
        // Given
        const appendSpy = vi.mocked(fs.appendFileSync);
        appendSpy.mockImplementation(() => {});
        startFileLogWriterWithLevels('/tmp/test.log', [LogLevel.WARN]);

        // When
        logMessage({ level: LogLevel.INFO }, 'skip file');
        logMessage({ level: LogLevel.WARN }, 'write file');

        // Then
        expect(appendSpy).toHaveBeenCalledTimes(1);
        expect(appendSpy.mock.calls[0][0]).toBe('/tmp/test.log');
        expect(appendSpy.mock.calls[0][1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[WARN\] write file\n$/);

        appendSpy.mockRestore();
    });

    it('writes to file at or above minLevel', () => {
        // Given
        const appendSpy = vi.mocked(fs.appendFileSync);
        appendSpy.mockImplementation(() => {});
        startFileLogWriterWithMinLevel('/tmp/test.log', LogLevel.INFO);

        // When
        logMessage({ level: LogLevel.DEBUG }, 'skip file');
        logMessage({ level: LogLevel.INFO }, 'info file');

        // Then
        expect(appendSpy).toHaveBeenCalledTimes(1);
        expect(appendSpy.mock.calls[0][1]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[INFO\] info file\n$/);

        appendSpy.mockRestore();
    });

    it('filters by component for console', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithMinLevel(LogLevel.TRACE, ['worker', 'ui']);

        // When
        logMessage({ level: LogLevel.INFO, component: 'worker' }, 'keep');
        logMessage({ level: LogLevel.INFO, component: 'db' }, 'drop');

        // Then
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.calls[0][0]).toMatch(/\[INFO\] \[worker\] keep$/);

        errorSpy.mockRestore();
    });

    it('filters by component for file', () => {
        // Given
        const appendSpy = vi.mocked(fs.appendFileSync);
        appendSpy.mockImplementation(() => {});
        startFileLogWriterWithLevels('/tmp/file.log', [LogLevel.DEBUG], ['ui']);

        // When
        logMessage({ level: LogLevel.DEBUG, component: 'ui' }, 'include');
        logMessage({ level: LogLevel.DEBUG, component: 'worker' }, 'exclude');

        // Then
        expect(appendSpy).toHaveBeenCalledTimes(1);
        expect(appendSpy.mock.calls[0][1]).toMatch(/\[DEBUG\] \[ui\] include\n$/);

        appendSpy.mockRestore();
    });

    it('skips missing component when filter expects one', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithLevels([LogLevel.INFO], ['ui']);

        // When
        logMessage({ level: LogLevel.INFO }, 'missing component');

        // Then
        expect(errorSpy).not.toHaveBeenCalled();

        errorSpy.mockRestore();
    });
    it('clears loggers on stopLoggers', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithMinLevel(LogLevel.TRACE);
        resetLogWriters();

        // When
        logMessage({ level: LogLevel.TRACE }, 'nothing should log');

        // Then
        expect(errorSpy).not.toHaveBeenCalled();

        errorSpy.mockRestore();
    });

    it('formats all levels to console', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithMinLevel(LogLevel.TRACE);

        // When
        logMessage({ level: LogLevel.TRACE }, 'trace msg');
        logMessage({ level: LogLevel.WARN }, 'warn msg');
        logMessage({ level: LogLevel.ERROR }, 'error msg');

        // Then
        expect(errorSpy).toHaveBeenCalledTimes(3);
        expect(errorSpy.mock.calls[0][0]).toMatch(/\[TRACE\] trace msg$/);
        expect(errorSpy.mock.calls[1][0]).toMatch(/\[WARN\] warn msg$/);
        expect(errorSpy.mock.calls[2][0]).toMatch(/\[ERROR\] error msg$/);

        errorSpy.mockRestore();
    });

    it('formats unknown levels as LOG', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithLevels([999 as LogLevel]);

        // When
        logMessage({ level: 999 as LogLevel }, 'custom level');

        // Then
        expect(errorSpy).toHaveBeenCalledTimes(1);
        expect(errorSpy.mock.calls[0][0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z \[LOG\] custom level$/);

        errorSpy.mockRestore();
    });

    it('allows all components when no component filter provided', () => {
        // Given
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        startConsoleLogWriterWithLevels([LogLevel.INFO]); // components defaults to []

        // When
        logMessage({ level: LogLevel.INFO }, 'no component');
        logMessage({ level: LogLevel.INFO, component: 'ui' }, 'with component');

        // Then
        expect(errorSpy).toHaveBeenCalledTimes(2);
        expect(errorSpy.mock.calls[0][0]).toMatch(/\[INFO\] no component$/);
        expect(errorSpy.mock.calls[1][0]).toMatch(/\[INFO\] \[ui\] with component$/);

        errorSpy.mockRestore();
    });

    it('creates an isolated logger via factory', () => {
        // Given
        const sink = vi.fn();
        const logger = createFilteredLogWriter({
            levelFilter: levelsFilter([LogLevel.INFO]),
            componentFilter: componentFilter(['ui']),
            logWriter: sink,
        });

        // When
        logger({ level: LogLevel.DEBUG, component: 'ui' }, 'skip');
        logger({ level: LogLevel.INFO, component: 'api' }, 'skip');
        logger({ level: LogLevel.INFO, component: 'ui' }, 'take');

        // Then
        expect(sink).toHaveBeenCalledTimes(1);
        expect(sink.mock.calls[0][0]).toEqual({ level: LogLevel.INFO, component: 'ui' });
        expect(sink.mock.calls[0][1]).toBe('take');
    });

    it('factory defaults allow all components when componentFilter omitted', () => {
        // Given
        const sink = vi.fn();
        const logger = createFilteredLogWriter({
            levelFilter: levelsFilter([LogLevel.INFO]),
            componentFilter: componentFilter([]),
            logWriter: sink,
        });

        // When
        logger({ level: LogLevel.INFO }, 'no component');
        logger({ level: LogLevel.INFO, component: 'db' }, 'with component');

        // Then
        expect(sink).toHaveBeenCalledTimes(2);
        expect(sink.mock.calls[0][0]).toEqual({ level: LogLevel.INFO });
        expect(sink.mock.calls[0][1]).toBe('no component');
        expect(sink.mock.calls[1][0]).toEqual({ level: LogLevel.INFO, component: 'db' });
        expect(sink.mock.calls[1][1]).toBe('with component');
    });
});
