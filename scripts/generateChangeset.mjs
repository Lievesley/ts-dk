#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { humanId } from 'human-id';

function usage() {
    return [
        'Usage:',
        '  node ./scripts/generateChangeset.mjs --patch <pkg> [--minor <pkg> ...] --description "<description>"',
        '',
        'Options:',
        '  --patch <pkg>               Add a patch bump for <pkg>.',
        '  --minor <pkg>               Add a minor bump for <pkg>.',
        '  --major <pkg>               Add a major bump for <pkg>.',
        '  --description, -d <text>    Changeset description',
    ].join('\n');
}

/**
 * @param {unknown} value - Parsed option value.
 * @returns {string[]} Package names.
 */
function parsePackageNames(value) {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new Error('Expected an array of package names.');
    }

    /** @type {string[]} */
    const pkgs = [];
    for (const rawPkg of value) {
        if (typeof rawPkg !== 'string') {
            throw new Error('Invalid package name.');
        }
        const pkg = rawPkg.trim();
        if (pkg === '') {
            throw new Error('Package name cannot be empty.');
        }
        pkgs.push(pkg);
    }
    return pkgs;
}

/**
 * @param {string[]} argv - Raw argv, excluding node and script.
 * @returns {{ patch: string[], minor: string[], major: string[], description: string }}
 */
function parseCliArgs(argv) {
    const { values } = parseArgs({
        args: argv,
        options: {
            patch: { type: 'string', multiple: true },
            minor: { type: 'string', multiple: true },
            major: { type: 'string', multiple: true },
            description: { type: 'string', short: 'd' },
        },
        strict: true,
    });

    const patch = parsePackageNames(values.patch);
    const minor = parsePackageNames(values.minor);
    const major = parsePackageNames(values.major);

    const description = typeof values.description === 'string' ? values.description.trim() : '';

    if (description.trim() === '') {
        throw new Error('A non-empty description is required.');
    }
    if (patch.length + minor.length + major.length === 0) {
        throw new Error('At least one package name is required.');
    }

    const seen = new Set();
    for (const pkg of [...patch, ...minor, ...major]) {
        if (seen.has(pkg)) {
            throw new Error(`Package "${pkg}" was specified more than once.`);
        }
        seen.add(pkg);
    }

    return { patch, minor, major, description };
}

/**
 * @param {{ patch: string[], minor: string[], major: string[] }} bumps - Packages grouped by bump type.
 * @param {string} description - Changeset description.
 * @returns {string} Changeset markdown.
 */
function buildChangesetMarkdown(bumps, description) {
    /** @type {string[]} */
    const bumpLines = [];
    for (const name of bumps.patch) {
        bumpLines.push(`"${name}": patch`);
    }
    for (const name of bumps.minor) {
        bumpLines.push(`"${name}": minor`);
    }
    for (const name of bumps.major) {
        bumpLines.push(`"${name}": major`);
    }

    const frontmatterLines = ['---', ...bumpLines, '---'];

    return `${frontmatterLines.join('\n')}\n\n${description.trim()}\n`;
}

async function main() {
    const { patch, minor, major, description } = parseCliArgs(process.argv.slice(2));

    const rootDir = fileURLToPath(new URL('../', import.meta.url));
    const changesetBase = path.resolve(rootDir, '.changesets');

    await mkdir(changesetBase, { recursive: true });

    let targetPath;
    for (let attempt = 0; attempt < 10; attempt++) {
        // Use code to generate filename.
        const changesetID = humanId({ separator: '-', capitalize: false });
        targetPath = path.resolve(changesetBase, `${changesetID}.md`);

        try {
            await writeFile(targetPath, buildChangesetMarkdown({ patch, minor, major }, description), { flag: 'wx' });
            break;
        } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === 'EEXIST') {
                continue;
            }
            throw error;
        }
    }

    if (!targetPath) {
        throw new Error('Failed to generate a unique changeset filename.');
    }

    process.stdout.write(`${path.relative(rootDir, targetPath)}\n`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    console.error('\n' + usage());
    process.exit(1);
});
