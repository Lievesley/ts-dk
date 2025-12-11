// Copyright (c) 2025 TE·AM. All rights reserved.

import { fileURLToPath } from 'url';

// TS-only project: no @eslint/js
import eslintPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import jsoncPlugin from 'eslint-plugin-jsonc';
import licenseHeaderPlugin from 'eslint-plugin-license-header';
import prettierPlugin from 'eslint-plugin-prettier';
import vitestPlugin from 'eslint-plugin-vitest';
import { parseForESLint as jsoncParseForESLint } from 'jsonc-eslint-parser';

// Constants

const rootDir = fileURLToPath(new URL('./', import.meta.url));
const companyName = 'TE·AM';
const copyrightYear = '2025';

// Optional helpers (no rules enabled by default)

function createLicenseHeader(name, year) {
    return [`// Copyright (c) ${year} ${name}. All rights reserved.`];
}

export default defineConfig([
    globalIgnores([
        'dist/**',
        'coverage/**',
        'node_modules/**',
        '.pnpm-store/**',
        'packages/*/dist/**',
        'packages/*/coverage/**',
        'packages/*/node_modules/**',
        'packages/*/.build/**',
    ]),

    // Base language options
    {
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
        },
    },

    // Plugin integrations
    {
        plugins: {
            prettier: prettierPlugin,
            jsonc: jsoncPlugin,
            import: importPlugin,
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: ['./tsconfig.json'],
                },
            },
        },
        rules: {
            'prettier/prettier': 'error',
            'import/extensions': [
                'error',
                'never',
                {
                    ignorePackages: true,
                },
            ],
            'import/order': [
                'error',
                {
                    groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
                    'newlines-between': 'always',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
        },
    },

    // License header
    {
        files: ['**/*.{cjs,mjs,js,jsx,jsonc,ts,tsx}'],
        ignores: ['{test,temp,dist,node_modules}/**'],
        plugins: {
            'license-header': licenseHeaderPlugin,
        },
        rules: {
            'license-header/header': ['error', createLicenseHeader(companyName, copyrightYear)],
        },
    },

    // Prettier config (disable ESLint rules that conflict)
    prettierConfig,

    // TypeScript
    {
        files: ['**/*.{ts,tsx}'],
        plugins: {
            '@typescript-eslint': eslintPlugin,
        },
        languageOptions: {
            parser: tsParser,
            parserOptions: {
                project: ['tsconfig.json', 'packages/*/tsconfig.json'],
                tsconfigRootDir: rootDir,
            },
        },
        rules: {
            '@typescript-eslint/no-floating-promises': 'error',
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                    ignoreRestSiblings: true,
                },
            ],
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-misused-promises': [
                'error',
                {
                    checksConditionals: true,
                    checksVoidReturn: true,
                    checksSpreads: true,
                },
            ],
        },
    },

    // TypeScript (tests) - override tsconfig for test files
    {
        files: ['test/**/*.{ts,tsx}'],
        plugins: {
            vitest: vitestPlugin,
        },
        rules: {
            // Test execution prevention
            'vitest/no-disabled-tests': 'warn', // Allow .skip() during migration
            'vitest/no-focused-tests': 'error', // Prevent .only()
            'vitest/no-identical-title': 'error', // Prevent duplicate titles

            // Test structure and organization
            'vitest/valid-expect': 'error', // Ensure valid expect calls
            'vitest/valid-describe-callback': 'error', // Ensure valid describe callbacks
        },
    },

    // TypeScript (debug) - use main tsconfig for debug files
    {
        files: ['temp/**/*.{ts,tsx}'],
        rules: {
            '@typescript-eslint/no-explicit-any': 'off', // Allow any in temporary debug files
        },
    },

    // JSON
    {
        files: ['**/*.json'],
        languageOptions: {
            parser: { parseForESLint: jsoncParseForESLint },
        },
        rules: {
            'jsonc/no-comments': 'error',
            'prettier/prettier': 'error',
        },
    },

    // JSONC
    {
        files: ['**/*.jsonc'],
        languageOptions: {
            parser: { parseForESLint: jsoncParseForESLint },
        },
        rules: {
            'prettier/prettier': 'error',
        },
    },

    // Vitest config
    // {
    //     files: ['vitest.config.ts', 'packages/*/vitest.config.ts'],
    //     languageOptions: {
    //         parser: tsParser,
    //         parserOptions: {
    //             project: false, // Disable project-based parsing for config files
    //         },
    //     },
    //     rules: {
    //         // Disable TypeScript rules that require type information
    //         '@typescript-eslint/no-floating-promises': 'off',
    //         '@typescript-eslint/no-unused-vars': 'off',
    //         '@typescript-eslint/no-misused-promises': 'off',
    //     },
    // },
]);
