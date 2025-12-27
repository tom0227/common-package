const baseConfig = require('@ori-packaging/config-common/configs/eslint.config.js');

module.exports = {
  ...baseConfig,
  parserOptions: {
    ...baseConfig.parserOptions,
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
  },
  rules: {
    ...baseConfig.rules,
    // Auth/RBAC特有のルール強化
    '@typescript-eslint/no-explicit-any': 'error',
    'no-console': 'warn',

    // セキュリティ強化（認証系パッケージなので厳格に）
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    '@typescript-eslint/no-unsafe-assignment': 'error',
    '@typescript-eslint/no-unsafe-call': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'error',
    '@typescript-eslint/no-unsafe-return': 'error',

    // 型安全性強化
    '@typescript-eslint/prefer-readonly': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
  },
  overrides: [
    ...baseConfig.overrides,
    {
      files: ['*.config.ts', '*.spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        'no-console': 'off',
      },
    },
  ],
};
