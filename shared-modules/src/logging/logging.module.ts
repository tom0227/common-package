import { Module, Global } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { EnhancedLoggerService } from './enhanced-logger.service';
import { loggerConfig } from './logger.config';

@Global()
@Module({
  imports: [WinstonModule.forRoot(loggerConfig)],
  providers: [
    EnhancedLoggerService,
    // LoggingInterceptorを一時的に無効化（GraphQL対応中）
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: LoggingInterceptor,
    // },
  ],
  exports: [EnhancedLoggerService],
})
export class LoggingModule {}
