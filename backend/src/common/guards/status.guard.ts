import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class StatusGuard implements CanActivate {
  /*
   * Protected route usage pattern:
   * @UseGuards(JwtAuthGuard, StatusGuard)
   *
   * Admin route usage pattern:
   * @UseGuards(JwtAuthGuard, StatusGuard, RolesGuard)
   * @Roles('SUPERADMIN')
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { status?: string } | undefined;

    if (!user || user.status !== 'ACTIVE') {
      throw new ForbiddenException('Account is not active');
    }

    return true;
  }
}
