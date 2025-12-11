#!/usr/bin/env node

// Copyright (c) 2025 TE·AM. All rights reserved.

import { basename } from 'node:path';

import { findWorkspacePackages } from '@pnpm/find-workspace-packages';

const packages = await findWorkspacePackages(process.cwd());

const uniq = Object.values(
    packages
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
        .reduce((acc, entry) => {
            acc[entry.name] = entry;
            return acc;
        }, {}),
);

process.stdout.write(`matrix=${JSON.stringify({ pkg: uniq })}`);
