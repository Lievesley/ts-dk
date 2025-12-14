// Copyright (c) 2025 TE·AM. All rights reserved.

import type { Config } from '@docusaurus/types';

const algolia =
    process.env.ALGOLIA_APP_ID && process.env.ALGOLIA_API_KEY && process.env.ALGOLIA_INDEX_NAME
        ? {
              appId: process.env.ALGOLIA_APP_ID,
              apiKey: process.env.ALGOLIA_API_KEY,
              indexName: process.env.ALGOLIA_INDEX_NAME,
              contextualSearch: true,
          }
        : undefined;

const config: Config = {
    title: 'TS-DK',
    tagline: 'The TypeScript DevKit.',
    favicon: 'img/favicon.svg',

    url: 'https://lievesley.github.io',
    baseUrl: process.env.BASE_URL ?? '/ts-dk/',

    // Organization name for the project.
    organizationName: 'TE·AM',
    projectName: 'ts-dk',

    onBrokenLinks: 'throw',
    markdown: {
        hooks: {
            onBrokenMarkdownLinks: 'throw',
        },
    },

    themeConfig: {
        navbar: {
            title: 'TS-DK',
            items: [
                { to: '/', label: 'Docs', position: 'left' },
                { to: '/api/', label: 'API', position: 'left' },
                { href: 'https://github.com/lievesley/ts-dk', label: 'GitHub', position: 'right' },
            ],
        },
        ...(algolia ? { algolia } : {}),
    },

    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            {
                docs: {
                    path: './docs',
                    routeBasePath: '/',
                    sidebarPath: './sidebars.ts',
                },
                blog: false,
                theme: {
                    customCss: './src/css/custom.css',
                },
            },
        ],
    ],

    plugins: [
        [
            '@docusaurus/plugin-client-redirects',
            {
                createRedirects(existingPath: string) {
                    // Create `/api/<pkg>/latest/...` redirects for every `/api/<pkg>/vX.Y.Z/...` page.
                    if (!existingPath.startsWith('/api/')) {
                        return undefined;
                    }
                    if (!existingPath.includes('/v')) {
                        return undefined;
                    }
                    const latestPath = existingPath.replace(/\/api\/([^/]+)\/v[^/]+/u, '/api/$1/latest');
                    return latestPath === existingPath ? undefined : [latestPath];
                },
            },
        ],
    ],
};

export default config;
