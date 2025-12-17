// Copyright (c) 2025 TE·AM. All rights reserved.

import { mkdir, readFile, stat, writeFile } from 'fs/promises';
import { dirname, join, relative, resolve } from 'path';

import ts from 'typescript';

// Constants
const REGEX_SPECIAL_CHARS_PATTERN = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes special regex characters in a string.
 * @param {string} str - The string to escape
 * @returns {string} The escaped string
 */
export function escapeRegExp(str) {
    return str.replace(REGEX_SPECIAL_CHARS_PATTERN, '\\$&');
}

/**
 * Checks if an object is empty (has no own enumerable properties).
 * @param {Object} obj - The object to check
 * @returns {boolean} True if the object is empty, false otherwise
 */
export function isEmptyObject(obj) {
    return Object.keys(obj).length === 0;
}

/**
 * Asynchronously checks whether a file exists.
 * @param {string} filePath - The path to the file
 * @returns {Promise<boolean>} - True if the file exists, false otherwise
 */
export async function isFile(filePath) {
    return stat(filePath)
        .then((stats) => stats.isFile())
        .catch(() => false);
}

/**
 * Asynchronously checks whether a directory exists.
 * @param {string} dirPath - The path to the directory
 * @returns {Promise<boolean>} - True if the directory exists, false otherwise
 */
export async function isDir(dirPath) {
    return stat(dirPath)
        .then((stats) => stats.isDirectory())
        .catch(() => false);
}

/**
 * Tries to resolve a file with optional extensions.
 * @param {string} basePath - The base file path (without extension)
 * @param {string[]} extensions - File extensions to try
 * @returns {Promise<string|null>} - Resolved file path or null if not found
 */
export async function tryResolveFile(basePath, extensions) {
    if (await isFile(basePath)) {
        return basePath;
    }

    const lastDotIndex = basePath.lastIndexOf('.');
    if (lastDotIndex >= 0 && lastDotIndex > basePath.lastIndexOf('/')) {
        basePath = basePath.slice(0, lastDotIndex);
    }

    for (const extension of extensions) {
        const pathWithExtension = basePath + '.' + extension;
        if (await isFile(pathWithExtension)) {
            return pathWithExtension;
        }
    }

    return null;
}

/**
 * Gets dependencies from a package.json object.
 * @param {Object} manifest - package.json contents
 * @param {string[]} dependencySections - Sections to get dependencies from
 * @returns {string[]} Array of dependency names
 */
export function getDependencies(
    manifest,
    dependencySections = ['dependencies', 'peerDependencies', 'optionalDependencies', 'devDependencies'],
) {
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Invalid package.json contents provided.');
    }

    const dependencySet = new Set();

    for (const section of dependencySections) {
        const entries = manifest[section];
        if (entries === undefined) {
            continue;
        }
        if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
            throw new Error(`Expected "${section}" to be an object in package.json.`);
        }

        for (const dependencyName in entries) {
            if (Object.prototype.hasOwnProperty.call(entries, dependencyName)) {
                dependencySet.add(dependencyName);
            }
        }
    }

    return Array.from(dependencySet);
}

/**
 * Resolves the package.json path from the npm_package_json environment variable.
 * @returns {string} Absolute path to package.json.
 */
export function resolveManifestPath() {
    const manifestPath = process.env.npm_package_json;
    if (!manifestPath) {
        throw new Error('npm_package_json environment variable is required.');
    }
    return resolve(manifestPath);
}

/**
 * Resolves the package name from the npm_package_name environment variable.
 * @returns {string} Package name.
 */
export function resolvePackageName() {
    let packageName = process.env.npm_package_name;
    if (typeof packageName !== 'string') {
        throw new Error('npm_package_name environment variable is required.');
    }
    packageName = packageName.trim();
    if (packageName === '') {
        throw new Error('npm_package_name is empty.');
    }
    return packageName;
}

/**
 * Resolves the build entry from package.json, enforcing a ./-prefixed relative path.
 * @param {Object} manifest - package.json contents.
 * @param {string} pkgDir - Absolute path to the package directory.
 * @returns {string} Absolute entry point path.
 */
export function resolveBuildEntry(manifest, pkgDir) {
    if (!manifest || typeof manifest !== 'object') {
        throw new Error('Invalid package.json contents provided.');
    }
    if (typeof pkgDir !== 'string' || pkgDir.trim() === '') {
        throw new Error('Package directory is required to resolve buildEntry.');
    }

    let buildEntry = manifest.buildEntry ?? './src/index.ts';
    if (typeof buildEntry !== 'string' || buildEntry.trim() === '') {
        throw new Error('buildEntry in package.json must be a non-empty string.');
    }

    buildEntry = buildEntry.trim();
    if (buildEntry.startsWith('/')) {
        throw new Error('buildEntry must be a relative path (use ./).');
    }
    if (!buildEntry.startsWith('./')) {
        buildEntry = `./${buildEntry}`;
    }

    return resolve(pkgDir, buildEntry);
}

/**
 * Extracts the compiler options from a tsconfig file.
 * @param {string} tsConfigPath - The path to the tsconfig file
 * @returns {Promise<Object>} - The compiler options
 */
export async function extractCompilerOptions(tsConfigPath) {
    const resolvedTSConfigPath = resolve(tsConfigPath);
    const { config, error } = ts.readConfigFile(resolvedTSConfigPath, ts.sys.readFile);

    if (error) {
        throw new Error(`Unable to read ${tsConfigPath}: ${ts.flattenDiagnosticMessageText(error.messageText, '\n')}`);
    }

    const parsedConfig = ts.parseJsonConfigFileContent(config, ts.sys, dirname(resolvedTSConfigPath), {}, resolvedTSConfigPath);

    if (parsedConfig.errors.length > 0) {
        const combinedErrors = parsedConfig.errors
            .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'))
            .join('\n');
        throw new Error(`Failed to parse ${tsConfigPath}:\n${combinedErrors}`);
    }

    return parsedConfig.options;
}

/**
 * Cached path resolver that resolves files with directory/index fallback.
 */
export class CachedPathResolver {
    /**
     * Creates a new cached path resolver.
     * @param {string[]} extensions - File extensions to try
     */
    constructor(extensions) {
        this.extensions = extensions;
        this.resolvedPathCache = new Map();
        this.directoryCache = new Map();
    }

    /**
     * Resolves a path to a file, checking cache first and trying index files for directories.
     * @param {string} pathToResolve - The path to resolve
     * @returns {Promise<string|null>} - Resolved file path or null if not found
     */
    async resolvePath(pathToResolve) {
        // Check cache first
        let resolvedFile = this.resolvedPathCache.get(pathToResolve);
        if (resolvedFile !== undefined) {
            return resolvedFile;
        }

        // Try to resolve the file
        resolvedFile = await tryResolveFile(pathToResolve, this.extensions);
        if (resolvedFile) {
            this.resolvedPathCache.set(pathToResolve, resolvedFile);
            return resolvedFile;
        }

        // Check if it's a directory (with caching)
        let isDirectory = this.directoryCache.get(pathToResolve);
        if (isDirectory === undefined) {
            isDirectory = await isDir(pathToResolve);
            this.directoryCache.set(pathToResolve, isDirectory);
        }

        if (isDirectory) {
            // Try resolving index file
            const indexPath = join(pathToResolve, 'index');
            let resolvedIndexFile = this.resolvedPathCache.get(indexPath);
            if (resolvedIndexFile === undefined) {
                resolvedIndexFile = await tryResolveFile(indexPath, this.extensions);
                this.resolvedPathCache.set(indexPath, resolvedIndexFile);
            }
            resolvedFile = resolvedIndexFile;
        }

        // Cache the result (even if null)
        this.resolvedPathCache.set(pathToResolve, resolvedFile);
        return resolvedFile;
    }
}

/**
 * Creates a publishable package.json object from provided metadata.
 * @param {object} sourceManifest - Parsed package.json contents to publish.
 * @returns {object} Publishable package.json content.
 */
export function publishManifest(sourceManifest) {
    if (!sourceManifest || typeof sourceManifest !== 'object') {
        throw new Error('sourceManifest is required to publish package.json.');
    }

    const publishableManifest = {
        name: sourceManifest.name,
        version: sourceManifest.version,
        description: sourceManifest.description,
        author: sourceManifest.author,
        license: sourceManifest.license,
        keywords: sourceManifest.keywords || [],
        type: sourceManifest.type,
        ...(sourceManifest.main && { main: sourceManifest.main }),
        ...(sourceManifest.module && { module: sourceManifest.module }),
        ...(sourceManifest.types && { types: sourceManifest.types }),
        ...(sourceManifest.exports && { exports: sourceManifest.exports }),
        ...(sourceManifest.sideEffects !== undefined && { sideEffects: sourceManifest.sideEffects }),
        ...(sourceManifest.bin && { bin: sourceManifest.bin }),
        ...(sourceManifest.dependencies && { dependencies: sourceManifest.dependencies }),
        ...(sourceManifest.peerDependencies && { peerDependencies: sourceManifest.peerDependencies }),
        ...(sourceManifest.optionalDependencies && { optionalDependencies: sourceManifest.optionalDependencies }),
        ...(sourceManifest.repository && { repository: sourceManifest.repository }),
        ...(sourceManifest.homepage && { homepage: sourceManifest.homepage }),
        ...(sourceManifest.bugs && { bugs: sourceManifest.bugs }),
        ...(sourceManifest.publishConfig && { publishConfig: sourceManifest.publishConfig }),
    };

    if (
        publishableManifest.publishConfig === undefined &&
        typeof publishableManifest.name === 'string' &&
        publishableManifest.name.startsWith('@')
    ) {
        publishableManifest.publishConfig = { access: 'public' };
    }

    return publishableManifest;
}

/**
 * Writes a publishable package.json to the target path using provided metadata.
 * @param {string} sourceManifestPath - Path to the source package.json to read.
 * @param {string} targetManifestPath - Path to write the publishable package.json.
 * @returns {Promise<void>} Promise that resolves when package.json is written.
 */
export async function publishManifestFile(sourceManifestPath, targetManifestPath) {
    if (!sourceManifestPath) {
        throw new Error('sourceManifestPath is required to publish package.json.');
    }
    if (!targetManifestPath) {
        throw new Error('targetManifestPath is required to publish package.json.');
    }

    const sourceManifest = await readFile(sourceManifestPath, 'utf-8');
    const sourceManifestDir = dirname(resolve(sourceManifestPath));
    const targetManifestDir = dirname(resolve(targetManifestPath));
    const publishableManifest = publishManifest(JSON.parse(sourceManifest));
    const makeRelativeToTargetManifest = (pathRelativeToSourceManifest) => {
        if (typeof pathRelativeToSourceManifest !== 'string') {
            throw new Error(
                'Expected pathRelativeToSourceManifest to be a string but got a ' +
                    typeof pathRelativeToSourceManifest +
                    ' with value ' +
                    pathRelativeToSourceManifest,
            );
        }
        if (pathRelativeToSourceManifest.trim() === '') {
            return '';
        }
        const absolutePath = resolve(sourceManifestDir, pathRelativeToSourceManifest);
        return './' + relative(targetManifestDir, absolutePath).replaceAll('\\', '/');
    };

    for (const key of ['main', 'module', 'types']) {
        if (publishableManifest[key]) {
            publishableManifest[key] = makeRelativeToTargetManifest(publishableManifest[key]);
        }
    }
    if (publishableManifest.exports && typeof publishableManifest.exports === 'object') {
        const rewriteExportEntry = (entry) => {
            if (typeof entry === 'string') {
                return makeRelativeToTargetManifest(entry);
            }
            if (Array.isArray(entry)) {
                return entry.map((item) => rewriteExportEntry(item));
            }
            if (entry && typeof entry === 'object') {
                return Object.fromEntries(Object.entries(entry).map(([cond, value]) => [cond, rewriteExportEntry(value)]));
            }
            return entry;
        };
        publishableManifest.exports = rewriteExportEntry(publishableManifest.exports);
        const rootExport = publishableManifest.exports?.['.'];
        if (rootExport && typeof rootExport === 'object' && !rootExport.default && rootExport.import) {
            rootExport.default = rootExport.import;
        }
    }

    await writeFileAndEnsureDir(targetManifestPath, JSON.stringify(publishableManifest, null, 4) + '\n');
}

/**
 * Writes a file, ensuring the parent directory exists.
 * @param {string} targetPath - Path to write.
 * @param {string|Buffer|Uint8Array} contents - Contents to write.
 * @param {BufferEncoding} [encoding='utf-8'] - Text encoding for string content.
 * @returns {Promise<void>} Promise that resolves when the file is written.
 */
export async function writeFileAndEnsureDir(targetPath, contents, encoding = 'utf-8') {
    if (typeof targetPath !== 'string' || targetPath.trim() === '') {
        throw new Error('targetPath is required to write a file.');
    }
    const resolvedPath = resolve(targetPath);
    const targetDir = dirname(resolvedPath);
    await mkdir(targetDir, { recursive: true });
    await writeFile(resolvedPath, contents, encoding);
}

/**
 * Renders a template string by replacing {{token}} placeholders with provided values.
 * @param {string} template - The template string to render.
 * @param {Record<string, string | number | boolean>} tags - Map of tag names to replacement values.
 * @returns {string} Rendered template string.
 */
export function renderTemplate(template, tags) {
    if (typeof template !== 'string') {
        throw new Error('Template must be a string.');
    }
    if (!tags || typeof tags !== 'object') {
        return template;
    }

    let rendered = template;
    for (const [key, value] of Object.entries(tags)) {
        rendered = rendered.replaceAll(`{{${key}}}`, String(value));
    }
    return rendered;
}

/**
 * Renders a template file to a target file using the provided replacements.
 * @param {string} sourcePath - Path to the template file.
 * @param {string} targetPath - Path where the rendered file will be written.
 * @param {Record<string, string | number | boolean>} replacements - Map of token names to replacement values.
 * @returns {Promise<void>} Promise that resolves when the file is written.
 */
export async function renderTemplateFile(sourcePath, targetPath, replacements) {
    const templateContents = await readFile(resolve(sourcePath), 'utf-8');
    const rendered = renderTemplate(templateContents, replacements);
    await writeFileAndEnsureDir(targetPath, rendered);
}
