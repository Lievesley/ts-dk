// Copyright (c) 2025 TE·AM. All rights reserved.

import { readFile } from 'fs/promises';
import { dirname, join, resolve } from 'path';

import esbuild from 'esbuild';

import {
    CachedPathResolver,
    escapeRegExp,
    extractCompilerOptions,
    getDependencies,
    isEmptyObject,
    resolveBuildEntry,
    resolveManifestPath,
    resolvePackageName,
} from './buildUtils.mjs';

// Constants
const POSTFIX_ASTERISK_PATTERN = /\/\*$/;

async function createTSConfigPathsPlugin(tsConfigPath, pluginName, compilerOptions) {
    if (!compilerOptions) {
        throw new Error('compilerOptions are required to create tsconfig paths plugin.');
    }
    const stripPostfixPattern = (str) => str.replace(POSTFIX_ASTERISK_PATTERN, '');

    const resolvedTsConfigPath = resolve(tsConfigPath);
    const baseUrl = compilerOptions.baseUrl || dirname(resolvedTsConfigPath);

    // Build an alias mapping from each key (removing trailing "/*") to an absolute path.
    const alias = {};
    const paths = compilerOptions.paths ?? {};
    for (const [key, targets] of Object.entries(paths)) {
        if (Array.isArray(targets) && targets.length > 0) {
            const cleanedKey = stripPostfixPattern(key);
            const cleanedTargets = targets.map((target) => resolve(baseUrl, stripPostfixPattern(target)));
            alias[cleanedKey] = cleanedTargets;
        }
    }

    // If no alias mappings are found, return a no-op plugin.
    if (isEmptyObject(alias)) {
        return {
            name: pluginName,
            setup() {},
        };
    }

    // Escape the keys using the escapeRegExp helper.
    const escapedKeys = Object.keys(alias).map(escapeRegExp);
    // Updated regex: alias key optionally followed by a slash and additional path.
    const pattern = new RegExp(`^(${escapedKeys.join('|')})(?:/(.*))?$`);

    // Extensions to try if the file can't be found.
    const extensions = ['ts', 'tsx', 'js', 'jsx'];

    return {
        name: pluginName,
        setup(build) {
            // Create cached path resolver for this build
            const resolver = new CachedPathResolver(extensions);

            // Handle path mappings (e.g., #/collections/IndexedSet)
            build.onResolve({ filter: pattern }, async (args) => {
                const match = args.path.match(pattern);
                if (match) {
                    const aliasKey = match[1];
                    const subpath = match[2] || '';
                    const targets = alias[aliasKey];

                    // Try each target in order
                    for (const target of targets) {
                        const resolvedPath = join(target, subpath);
                        const resolvedFile = await resolver.resolvePath(resolvedPath);

                        if (resolvedFile) {
                            return { path: resolvedFile };
                        }
                    }
                }
            });
        },
    };
}

/**
 * Builds a library or CLI tool module.
 * @param {Object} options - Build options
 * @param {string} options.entryPoint - Path to the entry point (e.g., 'src/tokenizer/index.ts')
 * @param {string} [options.libName] - Output filename without extension (e.g., 'my-lib' -> 'my-lib.js')
 *   If provided, uses outfile; otherwise uses outdir with filename derived from entry point
 * @param {string} options.outputDir - Output directory (default: 'dist/esm')
 * @param {Object[]} options.plugins - Array of esbuild plugins (order matters for onResolve hooks)
 * @param {string[]} options.external - External dependencies to exclude from bundle
 * @param {boolean} options.sourcemap - Generate source maps (default: true if outputName, false otherwise)
 * @param {boolean} options.minify - Minify output (default: true)
 * @param {Object} [options.banner] - Banner text to prepend to output (e.g., { js: '#!/usr/bin/env node' })
 * @returns {Promise<esbuild.BuildResult>} Build result
 */
async function build({
    entryPoint,
    libName,
    outputDir = 'dist/esm',
    plugins = [],
    external = [],
    sourcemap = libName !== undefined,
    minify = true,
    banner,
}) {
    const buildOptions = {
        entryPoints: [entryPoint],
        bundle: true,
        platform: 'node',
        format: 'esm',
        target: ['es2022'],
        plugins,
        external,
        sourcemap,
        minify,
    };

    if (banner) {
        buildOptions.banner = banner;
    }

    // Use outfile if libName is provided, otherwise use outdir
    if (libName) {
        buildOptions.outfile = join(outputDir, `${libName}.js`);
    } else {
        buildOptions.outdir = outputDir;
    }

    const result = await esbuild.build(buildOptions);
    return result;
}

async function main() {
    // Require pnpm/npm-provided env vars; intentional hard failure if missing.
    const packageName = resolvePackageName();
    console.log(`Compiling package ${packageName}`);
    const manifestPath = resolveManifestPath();
    console.log(`Manifest path: ${manifestPath}`);
    const packageJson = JSON.parse(await readFile(manifestPath, 'utf-8'));
    const dependencies = getDependencies(packageJson, ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies']);

    const pkgDir = dirname(manifestPath);
    const tsconfigArg = process.argv[2];
    const tsconfigPath = resolve(pkgDir, tsconfigArg ?? 'tsconfig.build.json');
    console.log(`tsconfig path: ${tsconfigPath}`);
    const compilerOptions = await extractCompilerOptions(tsconfigPath);
    const tsConfigPathsPlugin = await createTSConfigPathsPlugin(tsconfigPath, 'tsconfig-paths-plugin', compilerOptions);

    const entryPoint = resolveBuildEntry(packageJson, pkgDir);
    console.log(`entry point: ${entryPoint}`);
    const result = await build({
        entryPoint,
        plugins: [tsConfigPathsPlugin],
        external: dependencies,
        sourcemap: compilerOptions.sourceMap === true,
    });
    console.log(`Package "${packageName}" compiled in dist/esm: `, result);
}

main().catch((err) => {
    console.error('failed: ', err);
    process.exit(1);
});
