import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig: WinstonModuleOptions = {
  level: process.env.LOG_LEVEL ?? 'warn',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.metadata(),
    winston.format.colorize({ all: process.env.NODE_ENV === 'development' }),
    // 環境に応じた出力形式
    process.env.NODE_ENV === 'development'
      ? winston.format.combine(
          winston.format.simple(),
          winston.format.printf(({ timestamp, level, message, metadata, stack }) => {
            const metaStr = Object.keys(metadata || {}).length
              ? JSON.stringify(metadata, null, 2)
              : '';
            return `${timestamp} [${level}] ${message} ${metaStr}${stack ? '\n' + stack : ''}`;
          })
        )
      : winston.format.combine(
          winston.format.json(),
          // 本番環境では機密情報を除外するフィルター
          winston.format.printf((info) => {
            const sensitiveFields = [
              'password',
              'token',
              'secret',
              'key',
              'authorization',
              'cookie',
              'session',
            ];
            const cleanInfo = { ...info };

            const maskSensitiveData = (obj: unknown): unknown => {
              if (typeof obj !== 'object' || obj === null) return obj;

              if (Array.isArray(obj)) {
                return obj.map(maskSensitiveData);
              }

              const result: Record<string, unknown> = {};

              for (const [key, value] of Object.entries(obj)) {
                if (sensitiveFields.some((field) => key.toLowerCase().includes(field))) {
                  result[key] = '***MASKED***';
                } else if (typeof value === 'object') {
                  result[key] = maskSensitiveData(value);
                } else {
                  result[key] = value;
                }
              }

              return result;
            };

            return JSON.stringify(maskSensitiveData(cleanInfo));
          })
        )
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),

    // 本番環境ではファイルにも出力
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
            maxsize: parseInt(process.env.LOG_MAX_SIZE ?? '10485760', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES ?? '10', 10),
            tailable: true,
            zippedArchive: true,
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
            maxsize: parseInt(process.env.LOG_MAX_SIZE ?? '10485760', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES ?? '10', 10),
            tailable: true,
            zippedArchive: true,
          }),
          new winston.transports.File({
            filename: 'logs/performance.log',
            level: 'warn',
            maxsize: parseInt(process.env.LOG_MAX_SIZE ?? '10485760', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES ?? '5', 10),
            tailable: true,
            zippedArchive: true,
          }),
        ]
      : []),
  ],

  // セキュリティ関連の例外処理
  exceptionHandlers:
    process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/exceptions.log',
            maxsize: parseInt(process.env.LOG_MAX_SIZE ?? '10485760', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES ?? '5', 10),
            tailable: true,
            zippedArchive: true,
          }),
        ]
      : [],

  rejectionHandlers:
    process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: 'logs/rejections.log',
            maxsize: parseInt(process.env.LOG_MAX_SIZE ?? '10485760', 10),
            maxFiles: parseInt(process.env.LOG_MAX_FILES ?? '5', 10),
            tailable: true,
            zippedArchive: true,
          }),
        ]
      : [],
};
