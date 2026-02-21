import tsParser from '@typescript-eslint/parser';
import noLegacyStatBuff from './eslint-rules/dist/no-legacy-stat-buff.js';

export default [
  {
    files: ['packages/items/src/definitions/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      'custom-rules': {
        rules: {
          'no-legacy-stat-buff': noLegacyStatBuff,
        },
      },
    },
    rules: {
      'custom-rules/no-legacy-stat-buff': 'error',
    },
  },
];
