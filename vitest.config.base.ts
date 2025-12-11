// Copyright (c) 2025 TE·AM. All rights reserved.

import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';
// import { TestReporter } from './TestReporter';

/**
 * Base Vitest configuration to be extended by individual packages.
 * Import this in package configs like:
 * import baseConfig from 'vitest.config.base';
 */
export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        // reporters: [new TestReporter()],
        globals: false,
        environment: 'node',

        // Default coverage settings
        // coverage: {
        //     provider: 'v8',
        //     reporter: ['text', 'json', 'html'],
        //     exclude: ['**/node_modules/**', '**/dist/**', '**/*.d.ts'],
        // },
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'lcov'],
            include: ['src/**/*.{ts,tsx}', 'scripts/**/*.{ts,tsx}'],
            exclude: ['**/*.d.ts'],
            thresholds: {
                // global: {
                //     lines: 90,
                //     functions: 90,
                //     branches: 90,
                //     statements: 90,
                // },

                // Per-file thresholds - enforce 90% coverage for these modules
                './src/{libA,libB,libC}/**/*.{ts,tsx}': {
                    lines: 90,
                    functions: 90,
                    branches: 90,
                    statements: 90,
                },
            },
        },

        testTimeout: 10000,
        // Other common settings
    },
});
