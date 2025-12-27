import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission, CurrentUserData } from '../types/permission.types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionService } from '../services/permission.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(PermissionService) private readonly permissionService: PermissionService
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: unknown }>();
    if (!user) {
      throw new ForbiddenException('ユーザー情報が見つかりません');
    }

    const hasRequiredPermission = requiredPermissions.every(permission =>
      this.permissionService.hasPermission(user as CurrentUserData, permission)
    );

    if (!hasRequiredPermission) {
      throw new ForbiddenException('必要な権限がありません');
    }

    return true;
  }
}
