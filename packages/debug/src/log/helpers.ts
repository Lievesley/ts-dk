// Copyright (c) 2025 TE·AM. All rights reserved.

import { log } from './default';
import { LogLevel } from './types';

/**
 * Creates a log function for a specific component.
 * The returned function can be called with a log level and arguments to log at that level.
 * If no level is provided, the returned function will be a no-op.
 *
 * @param component - Component name to include in log messages.
 * @returns A function that takes a log level and arguments to log at that level for the component.
 */
export function createLog(component?: string): (level?: LogLevel, ...args: unknown[]) => void {
    if (component === undefined) {
        return (level?: LogLevel, ...args: unknown[]) => {
            if (level !== undefined) {
                log({ level }, ...args);
            }
        };
    }
    return (level?: LogLevel, ...args: unknown[]) => {
        if (level !== undefined) {
            log({ level, component }, ...args);
        }
    };
}
