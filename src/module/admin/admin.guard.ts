import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const auth: string | undefined = req.headers['authorization'];

    if (!auth?.startsWith('Bearer ')) throw new UnauthorizedException();

    const token = auth.split(' ')[1];
    try {
      const payload = this.jwtService.verify<{ email: string; isAdmin: boolean }>(token);
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      if (!payload.isAdmin || payload.email !== adminEmail) {
        throw new UnauthorizedException();
      }
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
