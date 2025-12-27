import { Module } from '@nestjs/common';
import { PermissionService } from './services/permission.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';

@Module({
  providers: [PermissionService, JwtAuthGuard, RolesGuard, PermissionsGuard],
  exports: [PermissionService, JwtAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthRbacModule {}
