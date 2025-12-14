#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findWorkspacePackages } from '@pnpm/find-workspace-packages';

function packageKey(packageName) {
    const parts = packageName.split('/');
    const key = parts[parts.length - 1];
    if (!key) {
        throw new Error(`Unable to compute package key for package name: ${packageName}`);
    }
    return key;
}

function runTypedoc(args) {
    execFileSync('pnpm', ['exec', 'typedoc', ...args], { stdio: 'inherit' });
}

function isVersionDirName(name) {
    return name.startsWith('v') && name.length > 1;
}

function isPreservedApiRootEntry(name) {
    return name === 'index.md' || isVersionDirName(name);
}

async function main() {
    const rootDir = fileURLToPath(new URL('../', import.meta.url));
    const docsRootDir = resolve(rootDir, 'packages', 'docs-site', 'docs');
    const apiRootDir = resolve(docsRootDir, 'api');
    const baseConfigPath = resolve(rootDir, 'typedoc.base.jsonc');

    mkdirSync(apiRootDir, { recursive: true });

    const packagesDir = resolve(rootDir, 'packages');
    const packages = await findWorkspacePackages(packagesDir);

    // Package versions are read from package.json files (source of truth).
    const packageEntries = packages
        .filter((pkg) => pkg.dir.startsWith(packagesDir))
        // Ignore nested build artifacts (e.g. packages/<name>/dist/package.json).
        .filter((pkg) => {
            const dir = resolve(pkg.dir);
            return !(dir.endsWith(`${sep}dist`) || dir.includes(`${sep}dist${sep}`));
        })
        .map((pkg) => ({ name: pkg.manifest.name, version: pkg.manifest.version, dir: pkg.dir }))
        .filter((pkg) => typeof pkg.name === 'string' && pkg.name.length > 0 && typeof pkg.version === 'string' && pkg.version.length > 0);

    if (packageEntries.length === 0) {
        throw new Error('No workspace packages found under packages/.');
    }

    const apiIndexLines = ['# API', ''];

    for (const pkg of packageEntries) {
        const key = packageKey(pkg.name);
        const pkgDir = resolve(apiRootDir, key);
        // Version comes from package.json (source of truth).
        const versionDirName = `v${pkg.version}`;
        const versionOutDir = resolve(pkgDir, versionDirName);
        const entryPoint = resolve(pkg.dir, 'src/index.ts');
        const tsconfig = resolve(pkg.dir, 'tsconfig.build.json');

        if (!(existsSync(entryPoint) && existsSync(tsconfig))) {
            continue;
        }

        mkdirSync(pkgDir, { recursive: true });
        for (const entry of readdirSync(pkgDir, { withFileTypes: true })) {
            if (isPreservedApiRootEntry(entry.name)) {
                continue;
            }
            rmSync(resolve(pkgDir, entry.name), { recursive: true, force: true });
        }

        rmSync(versionOutDir, { recursive: true, force: true });
        mkdirSync(versionOutDir, { recursive: true });

        runTypedoc([
            '--options',
            baseConfigPath,
            '--entryPoints',
            entryPoint,
            '--tsconfig',
            tsconfig,
            '--out',
            versionOutDir,
            '--includeVersion',
        ]);

        const versions = readdirSync(pkgDir, { withFileTypes: true })
            .filter((e) => e.isDirectory())
            .map((e) => e.name)
            .filter((name) => isVersionDirName(name))
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

        const pkgIndexLines = [
            `# ${pkg.name}`,
            '',
            `- [latest](./${versionDirName}/index.md)`,
            ...versions.map((name) => `- [${name}](./${name}/index.md)`),
            '',
        ];
        writeFileSync(resolve(pkgDir, 'index.md'), `${pkgIndexLines.join('\n')}\n`);

        apiIndexLines.push(`- [\`${pkg.name}\`](./${key}/${versionDirName}/index.md)`);
    }

    writeFileSync(resolve(apiRootDir, 'index.md'), `${apiIndexLines.join('\n')}\n`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
