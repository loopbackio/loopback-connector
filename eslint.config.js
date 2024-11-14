// SPDX-FileCopyrightText: Copyright LoopBack contributors 2024.
// SPDX-License-Identifier: MIT
'use strict';
const FlatCompat = require('@eslint/eslintrc').FlatCompat;
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends('loopback'),
  {
    languageOptions: {
      sourceType: 'commonjs',
    },
    rules: {
      'max-len': ['error', 90, 4, {
        ignoreComments: true,
        ignoreUrls: true,
        ignorePattern: '^\\s*var\\s.+=\\s*(require\\s*\\()|(/)',
      }],
    },
  },
];
