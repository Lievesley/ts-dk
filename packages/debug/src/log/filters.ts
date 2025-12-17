// Copyright (c) 2025 TE·AM. All rights reserved.

import { LogLevel, type LogFilter, type LogOptions } from './types';

/**
 * Create a filter that allows only the specified log levels.
 *
 * @param levels - Exact log levels to permit.
 * @returns Filter that passes when the log level is in `levels`.
 */
export function selectedLevelLogFilter(levels: LogLevel[]): LogFilter {
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
 * Create a filter that allows messages from components matching the given prefixes.
 *
 * @param componentPrefixes - Component name prefixes to match; empty array allows all components.
 * @returns Filter that passes when the component starts with any allowed prefix.
 */
export function componentPrefixLogFilter(componentPrefixes: string[]): LogFilter {
    if (componentPrefixes.length === 0) {
        return (_options: LogOptions): boolean => true;
    }
    return (options: LogOptions): boolean => {
        if (options.component === undefined) {
            return false;
        }
        for (const componentPrefix of componentPrefixes) {
            if (options.component.startsWith(componentPrefix)) {
                return true;
            }
        }
        return false;
    };
}

/**
 * Create a filter that allows messages from components matching the given names.
 *
 * @param components - Component names to match; empty array allows all components.
 * @returns Filter that passes when the component is allowed.
 */
export function componentMatchingLogFilter(components: string[]): LogFilter {
    if (components.length === 0) {
        return (_options: LogOptions): boolean => true;
    }
    const allowedComponents = new Set(components);
    return (options: LogOptions): boolean => options.component !== undefined && allowedComponents.has(options.component);
}

/**
 * Build a filter that passes only when the given environment variable
 * is set to a truthy value.
 *
 * The filter passes when the environment variable is set to any non-empty value
 * that is not explicitly falsy. Falsy values (case-insensitive, after trimming)
 * are: empty string, "0", "false", and "no". All other values (including "1",
 * "true", "yes", or any other string) are considered truthy and will pass.
 *
 * @param envVar - Name of the environment variable to check.
 * @returns LogFilter that returns true when envVar is set to a truthy value.
 */
export function envLogFilter(envVar: string): LogFilter {
    return (_options: LogOptions): boolean => {
        const value = process.env[envVar];
        if (value === undefined) {
            return false;
        }
        const normalized = value.trim().toLowerCase();
        if (normalized === '' || normalized === '0' || normalized === 'false' || normalized === 'no') {
            return false;
        }
        return true;
    };
}
