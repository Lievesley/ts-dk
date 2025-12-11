// Copyright (c) 2025 TE·AM. All rights reserved.

import { defineConfig, mergeConfig } from 'vitest/config';

import baseConfig from '../../vitest.config.base';

export default mergeConfig(
    baseConfig,
    defineConfig({
        test: {
            // Package-specific overrides
            include: ['test/unit/**/*.{test,spec}.{ts,tsx}'],
            // setupFiles: './vitest.setup.ts',

            benchmark: {
                include: ['test/benchmark/**/*.bench.{ts,tsx}'],
            },

            coverage: {
                include: ['src/**/*.{ts,tsx}'],
                thresholds: {
                    'src/**/*.{ts,tsx}': {
                        lines: 90,
                        functions: 90,
                        branches: 90,
                        statements: 90,
                    },
                },
            },
        },
    }),
);
