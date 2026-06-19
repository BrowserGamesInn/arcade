import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  // Global ignores — never lint compiled output or deps
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/.turbo/**'],
  },

  // Base JS + TS recommended rules for all source files
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Prettier disables all style rules that conflict with prettier
  prettier,

  // Project-wide rule overrides
  {
    rules: {
      // Respect the `_name` convention for intentionally unused vars/params.
      // e.g. `(_dt) => { ... }` in a callback that must match a signature.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Architecture boundary rule:
  // Game packages must never import `three` directly — they must use
  // the @arcade/engine public API only. This enforces the clean
  // rendering boundary defined in the architecture.
  {
    files: ['games/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['three', 'three/*'],
              message:
                'Games must not import three directly — use the @arcade/engine public API instead.',
            },
          ],
        },
      ],
    },
  },
);
