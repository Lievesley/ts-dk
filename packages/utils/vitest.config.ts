// Copyright (c) 2025 TE·AM. All rights reserved.

import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base';

export default mergeConfig(
    baseConfig,
    defineConfig({
        test: {
            // Package-specific overrides
            include: ['test/unit/**/*.{test,spec}.{ts,tsx}'],
            passWithNoTests: true,
            // setupFiles: './vitest.setup.ts',

            benchmark: {
                include: ['test/benchmark/**/*.bench.{ts,tsx}'],
            },

            coverage: {
                include: ['src/**/*.{ts,tsx}'],
                thresholds: {
                    'src/**/*.{ts,tsx}': {
                        lines: 0,
                        functions: 0,
                        branches: 0,
                        statements: 0,
                    },
                },
            },
        },
    }),
);
