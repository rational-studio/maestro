// @ts-check
/* eslint-env node */
/** @type {import('eslint').Linter.LegacyConfig} */
module.exports = {
  env: {
    browser: true,
    es2018: true,
  },
  globals: {
    process: 'readonly',
  },
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    curly: ['error', 'all'],
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-check': false,
        'ts-expect-error': false,
        'ts-ignore': true,
        'ts-nocheck': true,
      },
    ],
    '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],
    '@typescript-eslint/consistent-type-exports': 'warn',
    '@typescript-eslint/no-inferrable-types': 'error',
    '@typescript-eslint/no-unnecessary-type-parameters': 'error',
    '@typescript-eslint/no-unnecessary-type-constraint': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  },
  root: true,
};
