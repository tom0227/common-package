import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { UserRole } from '../../rbac/types/permission.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    // GraphQLとHTTPの両方に対応
    const contextType = context.getType<string>();
    let user: { roles?: string[] } | undefined;

    if (contextType === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const ctx = gqlContext.getContext();
      user = ctx.req?.user || ctx.user;
    } else {
      const request = context.switchToHttp().getRequest();
      user = request.user;
    }

    if (!user) {
      throw new ForbiddenException('ユーザー情報が見つかりません');
    }

    const hasRequiredRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRequiredRole) {
      throw new ForbiddenException('必要な権限がありません');
    }

    return true;
  }
}
