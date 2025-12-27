import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../types/permission.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: { roles?: UserRole[] } }>();
    if (!user) {
      throw new ForbiddenException('ユーザー情報が見つかりません');
    }

    const hasRequiredRole = requiredRoles.some(role => user.roles?.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException('必要な権限がありません');
    }

    return true;
  }
}
