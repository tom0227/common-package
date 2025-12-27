// 設定ファイルのパスを提供するユーティリティ
import * as path from 'path';

export interface ConfigPaths {
  eslint: string;
  tsconfig: string;
  jest: string;
  prettier: string;
}

/**
 * 共通設定ファイルのパスを取得
 */
export function getConfigPaths(): ConfigPaths {
  const configsDir = path.join(__dirname, '..', 'configs');

  return {
    eslint: path.join(configsDir, 'eslint.config.js'),
    tsconfig: path.join(configsDir, 'tsconfig.base.json'),
    jest: path.join(configsDir, 'jest.config.js'),
    prettier: path.join(configsDir, 'prettier.config.js'),
  };
}

/**
 * TypeScriptプロジェクト設定生成ヘルパー
 */
export interface TsConfigOptions {
  paths?: Record<string, string[]>;
  include?: string[];
  exclude?: string[];
}

export async function createTsConfig(options: TsConfigOptions = {}): Promise<object> {
  const basePath = getConfigPaths().tsconfig;
  const baseConfig = await import(basePath);

  return {
    extends: basePath,
    compilerOptions: {
      ...baseConfig.default.compilerOptions,
      paths: options.paths || {},
    },
    include: options.include || baseConfig.default.include,
    exclude: options.exclude || baseConfig.default.exclude,
  };
}

/**
 * Jest設定生成ヘルパー
 */
export interface JestConfigOptions {
  displayName?: string;
  moduleNameMapper?: Record<string, string>;
  setupFilesAfterEnv?: string[];
  testMatch?: string[];
  rootDir?: string;
}

export async function createJestConfig(
  type: 'unit' | 'integration' | 'e2e' = 'unit',
  options: JestConfigOptions = {}
): Promise<object> {
  const configModule = await import(getConfigPaths().jest);
  const { unitConfig, integrationConfig, e2eConfig } = configModule.default || configModule;

  const baseConfig = {
    unit: unitConfig,
    integration: integrationConfig,
    e2e: e2eConfig,
  }[type];

  return {
    ...baseConfig,
    displayName: options.displayName || baseConfig.displayName,
    rootDir: options.rootDir || '.',
    moduleNameMapper: {
      ...baseConfig.moduleNameMapper,
      ...options.moduleNameMapper,
    },
    setupFilesAfterEnv: options.setupFilesAfterEnv || baseConfig.setupFilesAfterEnv,
    testMatch: options.testMatch || baseConfig.testMatch,
  };
}

// 設定ファイルのパスをエクスポート（動的インポートで使用）
export const eslintConfigPath = path.join(__dirname, '../configs/eslint.config.js');
export const prettierConfigPath = path.join(__dirname, '../configs/prettier.config.js');
