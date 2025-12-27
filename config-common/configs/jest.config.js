const baseConfig = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.(t|j)s',
    '!src/**/*.spec.ts',
    '!src/**/*.e2e-spec.ts',
    '!src/**/*.integration.spec.ts',
    '!src/**/*.d.ts',
    '!src/main.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html', 'clover'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testTimeout: 30000,
  detectOpenHandles: true,
  forceExit: true,
  maxWorkers: '50%',
};

// 単体テスト用設定
const unitConfig = {
  ...baseConfig,
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/src/**/*.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
};

// 統合テスト用設定
const integrationConfig = {
  ...baseConfig,
  displayName: 'Integration Tests',
  testMatch: ['<rootDir>/src/**/*.integration.spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 60000,
};

// E2Eテスト用設定
const e2eConfig = {
  ...baseConfig,
  displayName: 'E2E Tests',
  testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'],
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  testTimeout: 120000,
};

module.exports = {
  baseConfig,
  unitConfig,
  integrationConfig,
  e2eConfig,
};
