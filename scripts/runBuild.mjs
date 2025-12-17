#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { execFile, spawn } from 'child_process';
import { copyFile, readFile, rm } from 'fs/promises';
import { dirname, resolve } from 'path';
import { promisify } from 'util';

import {
    extractCompilerOptions,
    isFile,
    publishManifestFile,
    renderTemplateFile,
    resolveManifestPath,
    resolvePackageName,
} from './buildUtils.mjs';

const execFileAsync = promisify(execFile);

/**
 * Runs a command and resolves with its exit code, optionally throwing on failure.
 * @param {string} command - The command to run.
 * @param {string} cwd - Working directory for the command.
 * @param {string[]} args - Arguments to pass to the command.
 * @param {boolean} [throwOnError=true] - Whether to throw on non-zero exit codes.
 * @returns {Promise<number>} Exit code (0 on success).
 */
async function runCommand(command, cwd, args, throwOnError = true) {
    return new Promise((resolvePromise, rejectPromise) => {
        const child = spawn(command, args, {
            stdio: 'inherit',
            cwd,
            shell: process.platform === 'win32',
        });

        const handleExit = (code) => {
            const exitCode = typeof code === 'number' ? code : 1;
            if (throwOnError && exitCode !== 0) {
                rejectPromise(new Error(`${command} ${args.join(' ')} exited with code ${exitCode}`));
                return;
            }
            resolvePromise(exitCode);
        };

        child.on('error', (err) => {
            const code = typeof err?.code === 'number' ? err.code : 1;
            handleExit(code);
        });
        child.on('close', (code) => {
            handleExit(code);
        });
    });
}

/**
 * Checks whether a file has uncommitted changes relative to git.
 * @param {string} cwd - Working directory to run git in.
 * @param {string} filePath - Path to the file to check.
 * @returns {Promise<boolean>} True if the file has changes or is untracked; false otherwise.
 */
async function isFileDirty(cwd, filePath) {
    try {
        const { stdout } = await execFileAsync('git', ['status', '--porcelain', '--', filePath], { cwd });
        return stdout.trim() !== '';
    } catch (err) {
        return false;
    }
}

async function main() {
    const packageName = resolvePackageName();
    console.log(`Building package ${packageName}`);
    const manifestPath = resolveManifestPath();
    const packageDir = dirname(manifestPath);
    const tsconfigPath = resolve(packageDir, 'tsconfig.build.json');
    const compilerOptions = await extractCompilerOptions(tsconfigPath);
    const outDir = compilerOptions.outDir;
    if (typeof outDir !== 'string' || outDir.trim() === '') {
        throw new Error('outDir in tsconfig.build.json is required to determine the dist directory.');
    }
    const distDir = resolve(packageDir, dirname(outDir));
    const readmeTemplatePath = resolve(packageDir, 'README.template.md');
    const readmePath = resolve(packageDir, 'README.md');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf-8'));
    try {
        await renderTemplateFile(readmeTemplatePath, readmePath, {
            name: manifest.name ?? '',
            version: manifest.version ?? '',
            description: manifest.description ?? '',
            homepage: manifest.homepage ?? '',
        });
    } catch {}
    if (!(await isFile(readmePath))) {
        throw new Error('README.md is required to build this package.');
    }
    console.log(`Rendered README from template at ${readmeTemplatePath}`);
    await rm(distDir, { recursive: true, force: true });
    await runCommand('pnpm', packageDir, ['run', 'compile']);
    await copyFile(readmePath, resolve(distDir, 'README.md'));
    const licensePath = resolve(packageDir, 'LICENSE');
    if (!(await isFile(licensePath))) {
        throw new Error('LICENSE is required to build this package.');
    }
    await copyFile(licensePath, resolve(distDir, 'LICENSE'));
    const targetManifestPath = resolve(distDir, 'package.json');
    await publishManifestFile(manifestPath, targetManifestPath);
    console.log(`Generated clean package.json at ${targetManifestPath}`);
    console.log(`Package "${packageName}" built in dist/`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
