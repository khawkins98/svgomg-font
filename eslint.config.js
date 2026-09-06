import js from '@eslint/js';
import globals from 'globals';

/**
 * Minimal, deliberately non-opinionated ESLint config.
 *
 * Catches real bugs (unused vars, undeclared globals, unreachable code) and
 * a small handful of foot-guns. Leaves formatting alone — no whitespace,
 * quote-style, or indent rules, so this can coexist with any editor
 * defaults or future prettier install without conflict.
 */
export default [
  js.configs.recommended,
  {
    // Browser code
    files: ['src/**/*.js', 'src/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      'no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    // Test files — same rules but with vitest globals available
    files: ['src/**/*.test.js', 'src/**/*.test.mjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  {
    // Build scripts + tooling — Node env
    files: ['scripts/**/*.js', 'scripts/**/*.mjs', 'vite.config.js', 'eslint.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', '.story/', 'public/'],
  },
];
