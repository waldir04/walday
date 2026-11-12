import js from '@eslint/js'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import prettierConfig from 'eslint-config-prettier'
import globals from 'globals'

const restrictedImportPatterns = [
  {
    group: ['../../*'],
    message: 'Use the @/ path alias instead of climbing directories.',
  },
  {
    group: ['@/features/*/*'],
    message: 'Import another slice through its public API (index.ts).',
  },
  {
    group: ['@/entities/*/*'],
    message: 'Import another slice through its public API (index.ts).',
  },
  {
    group: ['../features/*/*', '../entities/*/*'],
    message: 'Import another slice through its public API (index.ts).',
  },
]

export default [
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-unused-vars': 'off',
      'no-restricted-imports': [
        'error',
        { patterns: restrictedImportPatterns },
      ],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.vitest } },
  },
  prettierConfig,
]
