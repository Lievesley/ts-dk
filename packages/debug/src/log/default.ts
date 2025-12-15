// Copyright (c) 2025 TE·AM. All rights reserved.

import { createLoggerRegistry } from './LoggerRegistry';
import type { FilteredLogger, LoggerConfig, LogOptions } from './types';

const defaultLoggerRegistry = createLoggerRegistry();

/**
 * Remove all loggers from the default registry.
 */
export function resetLoggers(): void {
    defaultLoggerRegistry.reset();
}

/**
 * Start a logger in the default registry.
 *
 * @param config - Logger configuration including writer and filters.
 * @returns A filtered logger registered with the default registry.
 */
export function startLogger(config: LoggerConfig): FilteredLogger {
    return defaultLoggerRegistry.startLogger(config);
}

/**
 * Log a message through all loggers in the default registry.
 *
 * @param options - Log metadata for this message.
 * @param args - Arguments to render into the log output.
 */
export function log(options: LogOptions, ...args: unknown[]): void {
    defaultLoggerRegistry.log(options, ...args);
}
