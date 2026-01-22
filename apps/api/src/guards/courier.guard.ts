import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { UserDocument } from '@shopit/api-database';
import { hasRole, Role } from '@shopit/constants';

/**
 * Guard that ensures the user is an approved courier
 */
@Injectable()
export class CourierGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: UserDocument = request.user;

    if (!user) {
      throw new ForbiddenException(
        'You must be logged in to access this resource',
      );
    }

    // Check if user has courier role
    if (!hasRole(user.role, Role.COURIER)) {
      throw new ForbiddenException(
        'You must be an approved courier to access this resource',
      );
    }

    // Check if courier is approved
    if (!user.isCourierApproved) {
      throw new ForbiddenException('Your courier account is pending approval');
    }

    return true;
  }
}
