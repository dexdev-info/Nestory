import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '@common/decorators/roles.decorator';
import { UserRole } from '@generated/prisma/enums';
import { ICurrentUser } from '@common/interfaces/current-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Nếu route không yêu cầu role cụ thể nào -> Cho qua
    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: ICurrentUser }>();

    // Nếu có user và role của user nằm trong danh sách được phép -> Cho qua
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException('You do not have permission to access this resource');
    }

    return true;
  }
}
