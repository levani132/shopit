import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role, UserDocument } from '@sellit/api-database';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: UserDocument = request.user;

    if (!user) {
      throw new ForbiddenException('You must be logged in to access this resource');
    }

    // Admin has access to everything
    if (user.role === Role.ADMIN) {
      return true;
    }

    if (!requiredRoles.includes(user.role as Role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}


