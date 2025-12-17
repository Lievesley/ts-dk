#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

import { generateCommitMessage } from '@private-test-org/workflow';

import { log, LogLevel, startLogger } from './log.mjs';

const execFileAsync = promisify(execFile);

/**
 * @param {string} source - Commit message source.
 * @returns {boolean} Whether to skip generation based on source.
 */
function shouldSkipSource(source) {
    return source === 'merge' || source === 'squash' || source === 'commit' || source === 'message';
}

/**
 * @param {string} repoRoot - Repository root directory.
 * @param {string[]} args - Args for git.
 * @returns {Promise<string>} Stdout.
 */
async function git(repoRoot, args) {
    const { stdout } = await execFileAsync('git', args, { cwd: repoRoot });
    return String(stdout);
}

/**
 * @param {string[]} argv - Raw argv, excluding node and script.
 * @returns {{ messageFile: string, source: string, commitSha: string }}
 */
function parseCliArgs(argv) {
    const { values } = parseArgs({
        args: argv,
        options: {
            'message-file': { type: 'string' },
            source: { type: 'string' },
            'commit-sha': { type: 'string' },
        },
        strict: true,
        allowPositionals: false,
    });

    const messageFile = typeof values['message-file'] === 'string' ? values['message-file'].trim() : '';
    if (messageFile === '') {
        throw new Error('Missing required option: --message-file <path>.');
    }

    const source = typeof values.source === 'string' ? values.source : '';
    const commitSha = typeof values['commit-sha'] === 'string' ? values['commit-sha'] : '';

    return { messageFile, source, commitSha };
}

async function main() {
    startLogger();

    const { messageFile: messageFileArg, source } = parseCliArgs(process.argv.slice(2));
    log(LogLevel?.DEBUG, 'cli:', { messageFile: messageFileArg, source });

    if (shouldSkipSource(source)) {
        log(LogLevel?.DEBUG, 'skipping due to source:', source);
        return;
    }

    const rootDir = fileURLToPath(new URL('../', import.meta.url));
    const messageFilePath = path.isAbsolute(messageFileArg) ? messageFileArg : path.resolve(rootDir, messageFileArg);

    await generateCommitMessage({
        messageFilePath,
        rootDir,
        model: 'gpt-5-codex-mini',
        modelReasoningEffort: 'high',
    });
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
