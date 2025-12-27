export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      userMessage: this.userMessage ?? this.message,
      details: this.details,
      statusCode: this.statusCode,
    };
  }
}

export class UserNotFoundError extends DomainException {
  readonly code = 'USER_NOT_FOUND';
  readonly statusCode = 404;

  constructor(userId: string, details?: Record<string, unknown>) {
    super(`User with ID ${userId} not found`, { userId, ...details }, 'ユーザーが見つかりません');
  }
}

export class UserAlreadyExistsError extends DomainException {
  readonly code = 'USER_ALREADY_EXISTS';
  readonly statusCode = 409;

  constructor(identifier: string, field: string = 'id', details?: Record<string, unknown>) {
    super(
      `User with ${field} ${identifier} already exists`,
      { [field]: identifier, ...details },
      '既に登録されているユーザーです'
    );
  }
}

export class InvalidUserDataError extends DomainException {
  readonly code = 'INVALID_USER_DATA';
  readonly statusCode = 400;

  constructor(field: string, value: unknown, reason: string, details?: Record<string, unknown>) {
    super(
      `Invalid ${field}: ${reason}`,
      { field, value, reason, ...details },
      `${field}の値が正しくありません: ${reason}`
    );
  }
}

export class UserPermissionError extends DomainException {
  readonly code = 'USER_PERMISSION_DENIED';
  readonly statusCode = 403;

  constructor(action: string, userId: string, details?: Record<string, unknown>) {
    super(
      `Permission denied for action ${action} by user ${userId}`,
      { action, userId, ...details },
      'この操作を実行する権限がありません'
    );
  }
}
