#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { basename } from 'node:path';

import { findWorkspacePackages } from '@pnpm/find-workspace-packages';

const packages = await findWorkspacePackages(process.cwd());

const uniq = packages
    .map((pkg) => {
        const name = pkg.manifest.name;
        const dir = pkg.dir;
        if (!name || !dir) {
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

process.stdout.write(`matrix=${JSON.stringify({ pkg: uniq })}`);
