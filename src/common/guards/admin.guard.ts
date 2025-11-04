import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminSecret = request.headers['x-admin-secret'];

    const expectedSecret = this.configService.get<string>('ADMIN_SECRET');

    if (!adminSecret || adminSecret !== expectedSecret) {
      throw new UnauthorizedException('Invalid or missing admin credentials');
    }

    return true;
  }
}
