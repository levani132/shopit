import { SetMetadata } from '@nestjs/common';
import { RoleValue } from '@sellit/constants';

export const ROLES_KEY = 'roles';

/**
 * Roles decorator for bitmask-based role system
 *
 * Usage examples:
 * @Roles(Role.ADMIN) - Only admins
 * @Roles(Role.SELLER) - Only sellers (admin no longer auto-included)
 * @Roles(Role.SELLER, Role.ADMIN) - Sellers OR admins
 * @Roles(Role.COURIER, Role.ADMIN) - Couriers OR admins
 */
export const Roles = (...roles: RoleValue[]) => SetMetadata(ROLES_KEY, roles);
