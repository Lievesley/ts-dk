// Copyright (c) 2025 TE·AM. All rights reserved.

import type { FilterHandle, FilterMode, FilteredLogger, LogFilter, LogOptions, LogWriter } from './types';

/**
 * Logger that applies filters before writing.
 */
export class Logger implements FilteredLogger {
    private readonly filters = new Map<symbol, LogFilter>();

    public constructor(
        private readonly mode: FilterMode,
        private readonly logWriter: LogWriter,
        private readonly unregister: (controller: Logger) => void,
    ) {}

    /**
     * Attempt to write a log message if filters permit.
     *
     * @param options - Log metadata for this message.
     * @param args - Arguments to render into the log output.
     */
    public log(options: LogOptions, ...args: unknown[]): void {
        if (this.shouldWrite(options)) {
            this.logWriter(options, ...args);
        }
    }

    /**
     * Add a filter to this logger.
     *
     * @param filter - Predicate that determines if a log should pass.
     * @returns Handle that can be used to remove the filter.
     */
    public addFilter(filter: LogFilter): FilterHandle {
        const handle: FilterHandle = { id: Symbol('log-filter') };
        this.filters.set(handle.id, filter);
        return handle;
    }

    /**
     * Remove a filter by handle.
     *
     * @param handle - Handle returned by {@link addFilter}.
     * @returns True when the filter was removed.
     */
    public removeFilter(handle: FilterHandle): boolean {
        return this.filters.delete(handle.id);
    }

    /**
     * Remove all filters from this logger.
     */
    public clearFilters(): void {
        this.filters.clear();
    }

    /**
     * Unregister this logger from its registry.
     */
    public stop(): void {
        this.unregister(this);
    }

    private shouldWrite(options: LogOptions): boolean {
        if (this.filters.size === 0) {
            return true;
        }

        if (this.mode === 'any') {
            for (const filter of this.filters.values()) {
                if (filter(options)) {
                    return true;
                }
            }
            return false;
        }

        for (const filter of this.filters.values()) {
            if (!filter(options)) {
                return false;
            }
        }
        return true;
    }
}
