// Copyright (c) 2025 TE·AM. All rights reserved.

import { appendFileSync } from 'node:fs';
import { format } from 'node:util';

import { LogLevel, type LogOptions, type LogWriter } from './types';

function formatLog(options: LogOptions, args: unknown[]): string {
    const componentPart = options.component ? ` [${options.component}]` : '';
    const levelName = LogLevel[options.level] ?? options.level;
    return `${new Date().toISOString()} [${levelName}]${componentPart} ${format(...args)}`;
}

/**
 * Log writer that emits messages to stderr.
 *
 * @param options - Log metadata used for formatting.
 * @param args - Arguments to render into the message.
 */
export function consoleLogWriter(options: LogOptions, ...args: unknown[]): void {
    console.error(formatLog(options, args));
}

/**
 * Create a log writer that appends messages to a file.
 *
 * Falls back to console output if a write fails; the first failure is reported.
 *
 * @param filePath - Absolute or relative path to the log file.
 * @returns A log writer function that appends formatted messages.
 */
export function fileLogWriter(filePath: string): LogWriter {
    let hasLoggedError = false;
    return (options: LogOptions, ...args: unknown[]): void => {
        const message = formatLog(options, args);
        try {
            appendFileSync(filePath, message + '\n');
        } catch (error) {
            // Fallback to console if file write fails
            console.error(message);

            // Log the error once to avoid spam
            if (!hasLoggedError) {
                hasLoggedError = true;
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error(
                    `[LOG ERROR] Failed to write to log file "${filePath}": ${errorMessage}. ` +
                        'Falling back to console. Subsequent errors will be suppressed.',
                );
            }
        }
    };
}
