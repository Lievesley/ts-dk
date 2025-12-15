// Copyright (c) 2025 TE·AM. All rights reserved.

import { LogLevel, type LogFilter, type LogOptions } from './types';

/**
 * Create a filter that allows only the specified log levels.
 *
 * @param levels - Exact log levels to permit.
 * @returns Filter that passes when the log level is in `levels`.
 */
export function selectedLevelsLogFilter(levels: LogLevel[]): LogFilter {
    const allowedLogLevels = new Set(levels);
    return (options: LogOptions): boolean => allowedLogLevels.has(options.level);
}

/**
 * Create a filter that allows messages at or above the given minimum level.
 *
 * @param minLevel - Lowest severity that should be written.
 * @returns Filter that passes when `options.level` meets the threshold.
 */
export function minLevelLogFilter(minLevel: LogLevel): LogFilter {
    return (options: LogOptions): boolean => options.level >= minLevel;
}

/**
 * Create a filter that allows messages from specific components.
 *
 * @param components - Allowed component names; empty array allows all components.
 * @returns Filter that passes when the component is allowed.
 */
export function componentsLogFilter(components: string[]): LogFilter {
    if (components.length === 0) {
        return (): boolean => true;
    }
    const allowedComponents = new Set(components);
    return (options: LogOptions): boolean => options.component !== undefined && allowedComponents.has(options.component);
}

/**
 * Build a filter that passes only when the given environment variable
 * is set to a truthy value (non-empty string).
 *
 * @param envVar - Name of the environment variable to check.
 * @returns LogFilter that returns true when envVar is set.
 */
export function envLogFilter(envVar: string): LogFilter {
    return (): boolean => {
        const value = process.env[envVar];
        return typeof value === 'string' && value.trim() !== '';
    };
}
