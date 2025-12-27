import { ExceptionFilter, Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { Request, Response } from 'express';
import { StandardErrorResponse } from './http-exception.filter';

@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  catch(exception: BadRequestException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const timestamp = new Date().toISOString();
    const path = request.url;
    const method = request.method;
    const requestId = request.headers['x-request-id'] as string;

    const exceptionResponse = exception.getResponse() as {
      message: string | string[];
      error?: string;
      statusCode?: number;
    };

    // class-validator のエラーかチェック
    const isValidationError =
      Array.isArray(exceptionResponse.message) || exceptionResponse.message?.includes('validation');

    if (isValidationError) {
      const validationErrors = this.formatValidationErrors(exceptionResponse.message);

      const errorResponse: StandardErrorResponse = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'バリデーションエラーが発生しました',
          userMessage: '入力内容を確認してください',
          details: {
            fields: validationErrors,
            validationErrorCount: validationErrors.length,
          },
          timestamp,
          path,
          method,
          requestId,
        },
        meta: {
          timestamp,
          version: process.env.SERVICE_VERSION ?? '1.0.0',
          environment: process.env.NODE_ENV ?? 'development',
        },
      };

      response.status(400).json(errorResponse);
    } else {
      // 通常のBadRequestExceptionとして処理
      throw exception;
    }
  }

  private formatValidationErrors(messages: string | string[]): Array<{
    field: string;
    errors: string[];
    value?: unknown;
  }> {
    if (typeof messages === 'string') {
      return [
        {
          field: 'unknown',
          errors: [messages],
        },
      ];
    }

    if (!Array.isArray(messages)) {
      return [];
    }

    // class-validator のエラーメッセージを解析
    const fieldErrors: Record<string, { errors: string[]; value?: unknown }> = {};

    for (const message of messages) {
      // メッセージから フィールド名 を抽出を試行
      const fieldMatch = message.match(/^(\w+)\s/);
      const field: string = fieldMatch?.[1] ?? 'unknown';

      if (!fieldErrors[field]) {
        fieldErrors[field] = { errors: [] };
      }

      fieldErrors[field]!.errors.push(this.translateErrorMessage(message));
    }

    return Object.entries(fieldErrors).map(([field, data]) => ({
      field,
      errors: data.errors,
      value: data.value,
    }));
  }

  private translateErrorMessage(message: string): string {
    const translations: Record<string, string> = {
      'should not be empty': '必須項目です',
      'must be a string': '文字列で入力してください',
      'must be a number': '数値で入力してください',
      'must be a boolean': 'true/falseで入力してください',
      'must be an email': '正しいメールアドレス形式で入力してください',
      'must be a uuid': '正しいUUID形式で入力してください',
      'must be longer than': '文字数が不足しています',
      'must be shorter than': '文字数が多すぎます',
      'must match': '形式が正しくありません',
      'must be a valid': '正しい値を入力してください',
    };

    for (const [english, japanese] of Object.entries(translations)) {
      if (message.includes(english)) {
        return japanese;
      }
    }

    return message; // 翻訳できない場合はそのまま返す
  }
}
