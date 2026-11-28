import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '.claude/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-console': ['error', { allow: ['warn', 'error'] }],
    },
  },
  {
    files: ['*.config.js', 'apps/*/*.config.ts'],
    languageOptions: { globals: globals.node },
  },
  {
    // 規則引擎要能重播：不碰時間和不受控的亂數
    files: ['packages/rules/src/**/*.ts'],
    rules: {
      'no-restricted-properties': ['error', { object: 'Math', property: 'random' }],
      'no-restricted-globals': ['error', 'Date', 'performance', 'crypto', 'setTimeout'],
    },
  },
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: reactHooks.configs.recommended.rules,
  },
);
