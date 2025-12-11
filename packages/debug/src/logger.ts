// Copyright (c) 2025 TE·AM. All rights reserved.

import { appendFileSync } from 'node:fs';
import { format } from 'node:util';

export enum LogLevel {
    TRACE = 10,
    DEBUG = 20,
    INFO = 30,
    WARN = 40,
    ERROR = 50,
}

export interface LogOptions {
    level: LogLevel;
    component?: string;
}

export type LevelFilter = (level: LogLevel) => boolean;
export type ComponentFilter = (component?: string) => boolean;
export type LogWriter = (options: LogOptions, ...args: unknown[]) => void;

export interface FilteredLogWriterConfig {
    levelFilter: LevelFilter;
    componentFilter: ComponentFilter;
    logWriter: LogWriter;
}

const reusableDate = new Date();
function currentDate(): Date {
    reusableDate.setTime(Date.now());
    return reusableDate;
}

function formatLevel(level: LogLevel): string {
    switch (level) {
        case LogLevel.TRACE:
            return 'TRACE';
        case LogLevel.DEBUG:
            return 'DEBUG';
        case LogLevel.INFO:
            return 'INFO';
        case LogLevel.WARN:
            return 'WARN';
        case LogLevel.ERROR:
            return 'ERROR';
        default:
            return 'LOG';
    }
}

function formatLog(message: LogOptions, args: unknown[]): string {
    const componentPart = message.component ? ` [${message.component}]` : '';
    return `${currentDate().toISOString()} [${formatLevel(message.level)}]${componentPart} ${format(...args)}`;
}

export function consoleLogWriter(message: LogOptions, ...args: unknown[]): void {
    console.error(formatLog(message, args));
}

export function fileLogWriter(filePath: string): LogWriter {
    return (message: LogOptions, ...args: unknown[]): void => {
        appendFileSync(filePath, `${formatLog(message, args)}\n`);
    };
}

export function levelsFilter(levels: LogLevel[]): LevelFilter {
    const allowedLogLevels = new Set(levels);
    return (level: LogLevel): boolean => allowedLogLevels.has(level);
}

export function minLevelFilter(minLevel: LogLevel): LevelFilter {
    return (level: LogLevel): boolean => level >= minLevel;
}

export function componentFilter(components: string[]): ComponentFilter {
    if (components.length === 0) {
        return (): boolean => true;
    }
    const allowedComponents = new Set(components);
    return (component?: string): boolean => component !== undefined && allowedComponents.has(component);
}

const logWriters: LogWriter[] = [];

export function addLogWriter(logger: LogWriter): void {
    logWriters.push(logger);
}

export function resetLogWriters(): void {
    logWriters.length = 0;
}

export function createFilteredLogWriter({ levelFilter, componentFilter, logWriter }: FilteredLogWriterConfig): LogWriter {
    return (message: LogOptions, ...args: unknown[]): void => {
        if (levelFilter(message.level) && componentFilter(message.component)) {
            logWriter(message, ...args);
        }
    };
}

export function startConsoleLogWriterWithLevels(levels: LogLevel[], components: string[] = []): void {
    addLogWriter(
        createFilteredLogWriter({
            levelFilter: levelsFilter(levels),
            componentFilter: componentFilter(components),
            logWriter: consoleLogWriter,
        }),
    );
}

export function startConsoleLogWriterWithMinLevel(minLevel: LogLevel, components: string[] = []): void {
    addLogWriter(
        createFilteredLogWriter({
            levelFilter: minLevelFilter(minLevel),
            componentFilter: componentFilter(components),
            logWriter: consoleLogWriter,
        }),
    );
}

export function startFileLogWriterWithLevels(filePath: string, levels: LogLevel[], components: string[] = []): void {
    addLogWriter(
        createFilteredLogWriter({
            levelFilter: levelsFilter(levels),
            componentFilter: componentFilter(components),
            logWriter: fileLogWriter(filePath),
        }),
    );
}

export function startFileLogWriterWithMinLevel(filePath: string, minLevel: LogLevel, components: string[] = []): void {
    addLogWriter(
        createFilteredLogWriter({
            levelFilter: minLevelFilter(minLevel),
            componentFilter: componentFilter(components),
            logWriter: fileLogWriter(filePath),
        }),
    );
}

export function logMessage(options: LogOptions, ...args: unknown[]): void {
    for (const logger of logWriters) {
        logger(options, ...args);
    }
}
