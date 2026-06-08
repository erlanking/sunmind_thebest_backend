import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard {
  constructor(
    private readonly jwtService: JwtService,
    private reflector: Reflector,
  ) {}
  canActivate(context: ExecutionContext): boolean {
    const requireRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) throw new UnauthorizedException('Токен не передан');

    let user: any;
    try {
      user = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Токен недействителен');
    }
    request.user = user;

    if (!requireRoles) {
      return true;
    }

    return user.roles?.some((role) => requireRoles.includes(role.role_name));
  }
}
