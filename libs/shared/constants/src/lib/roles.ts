/**
 * Bitmask-based Role System
 *
 * Each role is a power of 2, allowing users to have multiple roles:
 * - User = 1 (00001) - Basic user, can browse and buy
 * - Courier = 2 (00010) - Can deliver orders
 * - Seller = 4 (00100) - Can create store and sell products
 * - Admin = 8 (01000) - Can manage platform
 * - CourierAdmin = 16 (10000) - Can manage couriers and view courier analytics
 *
 * Examples of combined roles:
 * - User + Courier = 3 (00011)
 * - User + Seller = 5 (00101)
 * - User + Admin = 9 (01001)
 * - User + Seller + Admin = 13 (01101)
 * - User + CourierAdmin = 17 (10001)
 * - User + CourierAdmin + Courier = 19 (10011) - Courier admin who also delivers
 * - All roles = 31 (11111)
 */

// Role bit values
export const Role = {
  USER: 1,
  COURIER: 2,
  SELLER: 4,
  ADMIN: 8,
  COURIER_ADMIN: 16,
} as const;

export type RoleValue = (typeof Role)[keyof typeof Role];

// All possible roles
export const ALL_ROLES =
  Role.USER | Role.COURIER | Role.SELLER | Role.ADMIN | Role.COURIER_ADMIN; // 31

// Role names for display
export const RoleNames: Record<RoleValue, string> = {
  [Role.USER]: 'User',
  [Role.COURIER]: 'Courier',
  [Role.SELLER]: 'Seller',
  [Role.ADMIN]: 'Admin',
  [Role.COURIER_ADMIN]: 'Courier Admin',
};

// Role names in Georgian
export const RoleNamesKa: Record<RoleValue, string> = {
  [Role.USER]: 'მომხმარებელი',
  [Role.COURIER]: 'კურიერი',
  [Role.SELLER]: 'გამყიდველი',
  [Role.ADMIN]: 'ადმინისტრატორი',
  [Role.COURIER_ADMIN]: 'კურიერ ადმინი',
};

/**
 * Check if a user has a specific role
 * @param userRoles - The user's combined role bitmask
 * @param requiredRole - The role to check for
 */
export function hasRole(userRoles: number, requiredRole: RoleValue): boolean {
  return (userRoles & requiredRole) === requiredRole;
}

/**
 * Check if a user has ANY of the specified roles
 * @param userRoles - The user's combined role bitmask
 * @param requiredRoles - Array of roles to check (user needs at least one)
 */
export function hasAnyRole(
  userRoles: number,
  requiredRoles: RoleValue[],
): boolean {
  for (const role of requiredRoles) {
    if (hasRole(userRoles, role)) {
      return true;
    }
  }
  return false;
}

/**
 * Check if a user has ALL of the specified roles
 * @param userRoles - The user's combined role bitmask
 * @param requiredRoles - Array of roles to check (user needs all)
 */
export function hasAllRoles(
  userRoles: number,
  requiredRoles: RoleValue[],
): boolean {
  for (const role of requiredRoles) {
    if (!hasRole(userRoles, role)) {
      return false;
    }
  }
  return true;
}

/**
 * Add a role to a user's role bitmask
 * @param currentRoles - The user's current role bitmask
 * @param roleToAdd - The role to add
 */
export function addRole(currentRoles: number, roleToAdd: RoleValue): number {
  return currentRoles | roleToAdd;
}

/**
 * Remove a role from a user's role bitmask
 * @param currentRoles - The user's current role bitmask
 * @param roleToRemove - The role to remove
 */
export function removeRole(
  currentRoles: number,
  roleToRemove: RoleValue,
): number {
  return currentRoles & ~roleToRemove;
}

/**
 * Toggle a role on/off
 * @param currentRoles - The user's current role bitmask
 * @param roleToToggle - The role to toggle
 */
export function toggleRole(
  currentRoles: number,
  roleToToggle: RoleValue,
): number {
  return currentRoles ^ roleToToggle;
}

/**
 * Get an array of individual roles from a combined bitmask
 * @param userRoles - The user's combined role bitmask
 */
export function getRoleList(userRoles: number): RoleValue[] {
  const roles: RoleValue[] = [];
  if (hasRole(userRoles, Role.USER)) roles.push(Role.USER);
  if (hasRole(userRoles, Role.COURIER)) roles.push(Role.COURIER);
  if (hasRole(userRoles, Role.SELLER)) roles.push(Role.SELLER);
  if (hasRole(userRoles, Role.ADMIN)) roles.push(Role.ADMIN);
  if (hasRole(userRoles, Role.COURIER_ADMIN)) roles.push(Role.COURIER_ADMIN);
  return roles;
}

/**
 * Get role names as a comma-separated string
 * @param userRoles - The user's combined role bitmask
 * @param locale - 'en' or 'ka' for language
 */
export function getRoleNamesString(
  userRoles: number,
  locale: 'en' | 'ka' = 'en',
): string {
  const names = locale === 'ka' ? RoleNamesKa : RoleNames;
  return getRoleList(userRoles)
    .map((role) => names[role])
    .join(', ');
}

/**
 * Create a role bitmask from an array of roles
 * @param roles - Array of roles to combine
 */
export function combineRoles(...roles: RoleValue[]): number {
  return roles.reduce((acc, role) => acc | role, 0);
}

/**
 * Legacy role string to bitmask conversion
 * Used for migration from old string-based role system
 */
export function legacyRoleToNumber(role: string): number {
  switch (role.toLowerCase()) {
    case 'admin':
      return Role.USER | Role.ADMIN; // Admins also have user role
    case 'seller':
      return Role.USER | Role.SELLER; // Sellers also have user role
    case 'courier':
      return Role.USER | Role.COURIER; // Couriers also have user role
    case 'user':
    default:
      return Role.USER;
  }
}

/**
 * Get the primary/highest role name for display
 * Priority: Admin > CourierAdmin > Seller > Courier > User
 */
export function getPrimaryRoleName(
  userRoles: number,
  locale: 'en' | 'ka' = 'en',
): string {
  const names = locale === 'ka' ? RoleNamesKa : RoleNames;
  if (hasRole(userRoles, Role.ADMIN)) return names[Role.ADMIN];
  if (hasRole(userRoles, Role.COURIER_ADMIN)) return names[Role.COURIER_ADMIN];
  if (hasRole(userRoles, Role.SELLER)) return names[Role.SELLER];
  if (hasRole(userRoles, Role.COURIER)) return names[Role.COURIER];
  return names[Role.USER];
}
