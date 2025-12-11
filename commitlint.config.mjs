// Copyright (c) 2025 TE·AM. All rights reserved.

export default {
    extends: ['@commitlint/config-angular'],
    rules: {
        'header-max-length': [2 /* error */, 'always', 100],
        'body-max-line-length': [2 /* error */, 'always', 120],
    },
};
