// Copyright (c) 2025 TE·AM. All rights reserved.

/**
 * Log severity levels in ascending order of verbosity.
 */
export enum LogLevel {
    TRACE = 10,
    DEBUG = 20,
    INFO = 30,
    WARN = 40,
    ERROR = 50,
}

/**
 * Metadata describing a log invocation.
 */
export interface LogOptions {
    /**
     * Severity level of the log message.
     */
    level: LogLevel;
    /**
     * Optional logical component name that emitted the message.
     */
    component?: string;
}

/**
 * Controls how multiple filters are evaluated.
 */
export type FilterMode = 'all' | 'any';

/**
 * Predicate that decides whether a log message should be emitted.
 *
 * @param options - Options for the log message being evaluated.
 * @returns True when the message should be written.
 */
export type LogFilter = (options: LogOptions) => boolean;

/**
 * Function that writes formatted log messages.
 *
 * @param options - Options for the log message.
 * @param args - Arguments to render as the log payload.
 * @returns Nothing; writes are side-effect only.
 */
export type LogWriter = (options: LogOptions, ...args: unknown[]) => void;

/**
 * Opaque handle used to remove a filter.
 */
export interface FilterHandle {
    readonly id: symbol;
}

/**
 * Runtime logger capable of managing filters and lifecycle.
 */
export interface FilteredLogger {
    /**
     * Write a log message if filters permit.
     *
     * @param options - Log metadata for this message.
     * @param args - Arguments to render into the log output.
     */
    log(options: LogOptions, ...args: unknown[]): void;

    /**
     * Add a filter to this logger.
     *
     * @param filter - Predicate that determines if a log should pass.
     * @returns Handle that can be used to remove the filter.
     */
    addFilter(filter: LogFilter): FilterHandle;

    /**
     * Remove a filter from this logger.
     *
     * @param handle - Handle returned by {@link addFilter}.
     * @returns True when the filter was removed.
     */
    removeFilter(handle: FilterHandle): boolean;

    /**
     * Remove all filters from this logger.
     */
    clearFilters(): void;

    /**
     * Unregister this logger from its registry.
     */
    stop(): void;
}

/**
 * Configuration for creating a logger.
 */
export interface LoggerConfig {
    /**
     * Sink that will receive log messages.
     */
    logWriter: LogWriter;

    /**
     * How filters are combined. Defaults to `all`.
     */
    mode?: FilterMode;

    /**
     * Explicit log levels to allow. Takes precedence over {@link minLevel}.
     */
    levels?: LogLevel[];

    /**
     * Minimum severity to allow when `levels` is not provided.
     */
    minLevel?: LogLevel;

    /**
     * Optional list of component prefixes that may emit logs. Empty list means allow all components.
     */
    componentPrefixes?: string[];

    /**
     * Additional custom filters to apply.
     */
    filters?: LogFilter[];
}
