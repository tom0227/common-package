import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Auth0Service } from './services/auth0.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('auth.clientSecret'),
        signOptions: {
          expiresIn: '24h',
        },
      }),
    }),
  ],
  providers: [JwtStrategy, Auth0Service, JwtAuthGuard, RolesGuard, Reflector],
  exports: [Auth0Service, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
