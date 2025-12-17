// Copyright (c) 2025 TE·AM. All rights reserved.

import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { Codex } from '@openai/codex-sdk';
import { toJSONSchema, z } from 'zod';

import { log, LogLevel } from './log';

const execFileAsync = promisify(execFile);

const COMMIT_TYPES = ['build', 'ci', 'docs', 'feat', 'fix', 'perf', 'refactor', 'revert', 'style', 'test'] as const;

export const CommitMessageModelSchema = z
    .object({
        type: z.enum(COMMIT_TYPES),
        scope: z.string().trim().min(1).optional(),
        subject: z.string().trim().min(1),
        body: z.array(z.string().trim().min(1)).min(1),
        footer: z.string().trim().min(1).optional(),
    })
    .strict();

const CommitMessageJsonSchemaRaw = toJSONSchema(CommitMessageModelSchema) as {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: boolean;
};

// Codex requires all properties in 'properties' to be in 'required', so we make optional fields nullable.
export const CommitMessageJsonSchema = {
    ...CommitMessageJsonSchemaRaw,
    properties: {
        ...CommitMessageJsonSchemaRaw.properties,
        scope: {
            ...(CommitMessageJsonSchemaRaw.properties.scope as Record<string, unknown>),
            type: ['string', 'null'],
        },
        footer: {
            ...(CommitMessageJsonSchemaRaw.properties.footer as Record<string, unknown>),
            type: ['string', 'null'],
        },
    },
    required: ['type', 'subject', 'body', 'scope', 'footer'],
    additionalProperties: false,
} as const;

export type CommitMessage = z.infer<typeof CommitMessageModelSchema>;

export interface GenerateCommitMessageOptions {
    messageFilePath: string;
    repoRoot: string;
    model?: string;
    modelReasoningEffort?: string;
}

export interface StagedChanges {
    files: string[];
    diff: string;
}

function formatError(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

function hasUserContent(text: string): boolean {
    return text
        .split('\n')
        .map((line) => line.trim())
        .some((line) => line !== '' && !line.startsWith('#'));
}

function enforceHeaderMaxLength(header: string, maxLen: number): string {
    if (header.length <= maxLen) {
        return header;
    }

    // Drop scope first.
    const withoutScope = header.replace(/^([a-z]+)\([^)]*\):\s*/, '$1: ');
    if (withoutScope.length <= maxLen) {
        return withoutScope;
    }

    // Last resort: truncate subject to fit.
    const match = withoutScope.match(/^([a-z]+:\s*)(.*)$/);
    if (!match) {
        return withoutScope.slice(0, maxLen);
    }
    const prefix = match[1] ?? '';
    const subject = match[2] ?? '';
    const allowed = Math.max(0, maxLen - prefix.length);
    const truncated = subject.slice(0, allowed).replace(/[.\s]+$/u, '');
    return `${prefix}${truncated}`;
}

function formatCommitMessage(model: CommitMessage, headerMaxLen: number): string {
    const scope = typeof model.scope === 'string' ? model.scope.trim() : '';
    const subject = model.subject.trim().replace(/\.$/u, '');

    const headerBase = scope !== '' ? `${model.type}(${scope}): ${subject}` : `${model.type}: ${subject}`;
    const header = enforceHeaderMaxLength(headerBase, headerMaxLen);

    const bodyLines = model.body.map((line) => `- ${line.trim()}`);
    const footer = typeof model.footer === 'string' ? model.footer.trim() : '';

    const sections = [header, '', ...bodyLines];
    if (footer !== '') {
        sections.push('', footer);
    }

    return `${sections.join('\n')}\n`;
}

async function readHeaderMaxLength(repoRoot: string): Promise<number> {
    const configPath = path.resolve(repoRoot, 'commitlint.config.mjs');
    try {
        const configURL = pathToFileURL(configPath);
        const imported = await import(configURL.href);
        const config = imported?.default as { rules?: { 'header-max-length'?: unknown } } | undefined;
        const value = config?.rules?.['header-max-length'];
        const max = Array.isArray(value) ? value[2] : undefined;
        log(LogLevel?.DEBUG, 'commitlint header-max-length:', max);
        return typeof max === 'number' ? max : 100;
    } catch {
        log(LogLevel?.DEBUG, 'failed to read commitlint config; defaulting header-max-length=100');
        return 100;
    }
}

async function git(repoRoot: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync('git', args, { cwd: repoRoot });
    return String(stdout);
}

export async function getStagedChanges(repoRoot: string): Promise<StagedChanges> {
    const filesText = await git(repoRoot, ['diff', '--cached', '--name-only']);
    const files = filesText
        .split('\n')
        .map((s) => s.trim())
        .filter((s) => s !== '');

    const diff = await git(repoRoot, ['--no-pager', 'diff', '--cached']);
    log(LogLevel?.DEBUG, 'staged files:', files);
    log(LogLevel?.DEBUG, 'staged diff chars:', diff.length);
    return { files, diff };
}

function capDiff(diff: string): { diff: string; truncated: boolean } {
    const maxChars = 120_000;
    if (diff.length <= maxChars) {
        return { diff, truncated: false };
    }
    return { diff: `${diff.slice(0, maxChars)}\n\n[diff truncated]\n`, truncated: true };
}

async function callCodexJson(model: string, modelReasoningEffort: string, prompt: string): Promise<unknown> {
    log(LogLevel?.DEBUG, 'starting Codex thread:', { model, modelReasoningEffort });
    const codex = new Codex();
    const thread = codex.startThread({ model, modelReasoningEffort: modelReasoningEffort as 'high' | 'low' | 'medium' });

    const instructions = [
        'Return ONLY a single JSON object matching this JSON Schema.',
        'Do not wrap in markdown fences and do not include commentary.',
        '',
        prompt,
    ].join('\n');

    log(LogLevel?.DEBUG, 'sending prompt chars:', instructions.length);
    const turn = await thread.run(instructions, { outputSchema: CommitMessageJsonSchema });
    if (!turn || typeof turn !== 'object' || typeof turn.finalResponse !== 'string') {
        throw new Error('Unexpected Codex output type.');
    }
    log(LogLevel?.DEBUG, 'received output chars:', turn.finalResponse.length);
    // With outputSchema, finalResponse is guaranteed to be valid JSON.
    return JSON.parse(turn.finalResponse.trim());
}

function buildPrompt(files: string[], diff: string, headerMaxLength: number): string {
    const typeList = COMMIT_TYPES.map((t) => `\`${t}\``).join(', ');

    return [
        'Generate a conventional commit message for the following staged git diff.',
        '',
        'Rules:',
        `- Allowed types: ${typeList}.`,
        '- Scope is optional. If used, prefer a meaningful scope like `core`, `parser`, `cli`, `docs`, `deps`, or a package name.',
        '- Subject must be imperative mood with no trailing period.',
        `- Header must be <= ${headerMaxLength} characters.`,
        '- Body MUST be a bullet list; return each bullet WITHOUT the "- " prefix (it will be added).',
        '- Footer is optional and ONLY for breaking changes. If present, use "BREAKING CHANGE: <details>".',
        '',
        'Output JSON only (no markdown fences, no commentary) matching the provided schema.',
        '',
        'Staged files:',
        ...files.map((f) => `- ${f}`),
        '',
        'Staged diff:',
        diff,
        '',
    ].join('\n');
}

export async function generateCommitMessage(options: GenerateCommitMessageOptions): Promise<void> {
    const { messageFilePath, repoRoot, model = 'gpt-5-codex-mini', modelReasoningEffort = 'high' } = options;

    log(LogLevel?.DEBUG, 'repoRoot:', repoRoot);
    log(LogLevel?.DEBUG, 'messageFilePath:', messageFilePath);

    const existing = await readFile(messageFilePath, 'utf-8').catch(() => '');
    if (existing !== '' && hasUserContent(existing)) {
        log(LogLevel?.DEBUG, 'commit message already has content; leaving unchanged');
        return;
    }

    log(LogLevel?.DEBUG, 'OPENAI_MODEL:', model);
    log(LogLevel?.DEBUG, 'OPENAI_MODEL_REASONING_EFFORT:', modelReasoningEffort);

    const headerMaxLength = await readHeaderMaxLength(repoRoot);
    const { files, diff } = await getStagedChanges(repoRoot);
    if (files.length === 0) {
        log(LogLevel?.DEBUG, 'no staged files; leaving unchanged');
        return;
    }

    const capped = capDiff(diff);
    log(LogLevel?.DEBUG, 'diff truncated:', capped.truncated);
    const promptText = buildPrompt(files, capped.diff, headerMaxLength);

    let json: unknown;
    try {
        json = await callCodexJson(model, modelReasoningEffort, promptText);
    } catch (error) {
        const errorMessage = formatError(error);
        log(LogLevel?.DEBUG, 'Codex error:', error);
        throw new Error(`Codex unavailable: ${errorMessage}`);
    }

    // Transform null to undefined for optional fields (Codex may return null for optional fields).
    if (json && typeof json === 'object' && json !== null && !Array.isArray(json)) {
        const obj = json as Record<string, unknown>;
        if (obj.scope === null) {
            delete obj.scope;
        }
        if (obj.footer === null) {
            delete obj.footer;
        }
    }

    const parsed = CommitMessageModelSchema.parse(json);
    log(LogLevel?.DEBUG, 'parsed commit model:', parsed);

    const message = formatCommitMessage(parsed, headerMaxLength);
    log(LogLevel?.DEBUG, 'generated message chars:', message.length);
    await writeFile(messageFilePath, message, 'utf-8');
    log(LogLevel?.DEBUG, 'wrote commit message');
}
