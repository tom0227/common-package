export * from './domain-exception.base';
export * from './http-exception.filter';
export * from './validation-exception.filter';

// Re-export commonly used NestJS exceptions for consistency
export { BadRequestException } from '@nestjs/common';
