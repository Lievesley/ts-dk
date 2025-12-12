#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { basename, resolve } from 'node:path';

import { findWorkspacePackages } from '@pnpm/find-workspace-packages';

async function main() {
    const packages = await findWorkspacePackages(process.cwd());

    const root = resolve(process.cwd());
    const packagesDir = resolve(root, 'packages');
    const uniq = packages
        .map((pkg) => {
            const name = pkg.manifest.name;
            if (!name) {
                return null;
            }
            const dir = resolve(pkg.dir);
            // Exclude root workspace package, only include packages under packages/
            if (!dir || dir === root || !dir.startsWith(packagesDir)) {
                return null;
            }
            const slug = basename(dir);
            return { name, dir, slug };
        })
        .filter(Boolean)
        .reduce(
            (acc, entry) => {
                if (!acc.seen.has(entry.name)) {
                    acc.seen.add(entry.name);
                    acc.items.push(entry);
                }
                return acc;
            },
            { seen: new Set(), items: [] },
        ).items;

    process.stdout.write(JSON.stringify({ pkg: uniq }));
}

main().catch((error) => {
    console.error('Error generating docs matrix:', error);
    process.exit(1);
});
