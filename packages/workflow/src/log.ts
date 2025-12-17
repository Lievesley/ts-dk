// Copyright (c) 2025 TE·AM. All rights reserved.

const dbg = await import('@private-test-org/debug').catch(() => null);

const LOG_COMPONENT = 'ts-dk/workflow';

export const LogLevel = dbg?.LogLevel;
export const log = dbg?.createComponentLog?.(LOG_COMPONENT) ?? ((..._args: unknown[]) => {});
