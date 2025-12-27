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
    // テストユーティリティ特有のルール調整
    '@typescript-eslint/no-explicit-any': 'warn', // テストでは一部緩和
    'no-console': 'off', // テストでのデバッグ出力許可

    // テスト関連の型安全性は少し緩和
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    // テストユーティリティでは柔軟性を重視
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
  overrides: [
    ...baseConfig.overrides,
    {
      files: ['*.spec.ts', '*.test.ts', '**/test/**/*.ts', '**/tests/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-return': 'off',
        'no-console': 'off',
      },
    },
  ],
};
