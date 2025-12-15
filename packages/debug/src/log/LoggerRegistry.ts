// Copyright (c) 2025 TE·AM. All rights reserved.

import { componentsLogFilter, minLevelLogFilter, selectedLevelsLogFilter } from './filters';
import { Logger } from './Logger';
import type { FilteredLogger, LoggerConfig, LogOptions } from './types';

/**
 * Registry that tracks active loggers and fans out log events to them.
 */
export class LoggerRegistry {
    private readonly loggers = new Set<Logger>();

    /**
     * Remove all registered loggers.
     */
    public reset(): void {
        this.loggers.clear();
    }

    /**
     * Create and register a logger with the provided configuration.
     *
     * @param config - Logger configuration including writer and filters.
     * @returns A filtered logger instance registered with this registry.
     */
    public startLogger(config: LoggerConfig): FilteredLogger {
        const { logWriter, mode = 'all', levels = [], minLevel, components = [], filters = [] } = config;
        const logger = new Logger(mode, logWriter, (c) => {
            this.loggers.delete(c);
        });

        if (levels.length > 0) {
            logger.addFilter(selectedLevelsLogFilter(levels));
        } else if (minLevel !== undefined) {
            logger.addFilter(minLevelLogFilter(minLevel));
        }
        logger.addFilter(componentsLogFilter(components));
        for (const filter of filters) {
            logger.addFilter(filter);
        }

        this.loggers.add(logger);
        return logger;
    }

    /**
     * Send a log message to all registered loggers.
     *
     * @param options - Log metadata for this message.
     * @param args - Arguments to render into the log output.
     */
    public log(options: LogOptions, ...args: unknown[]): void {
        for (const logger of this.loggers) {
            logger.log(options, ...args);
        }
    }
}

/**
 * Create a new logger registry.
 *
 * @returns A new {@link LoggerRegistry} instance.
 */
export function createLoggerRegistry(): LoggerRegistry {
    return new LoggerRegistry();
}
