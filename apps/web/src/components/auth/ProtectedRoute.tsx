'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { useLocale } from 'next-intl';
import { Role, RoleValue, hasAnyRole } from '@sellit/constants';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: RoleValue[];
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  allowedRoles = [Role.ADMIN, Role.SELLER, Role.USER, Role.COURIER],
  redirectTo,
}: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const locale = useLocale();

  const userRole = user?.role ?? 0;
  const hasAllowedRole = hasAnyRole(userRole, allowedRoles);

  useEffect(() => {
    if (isLoading) return;

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      const loginPath = `/${locale}/login`;
      router.push(redirectTo || loginPath);
      return;
    }

    // Check role
    if (user && !hasAllowedRole) {
      router.push(`/${locale}`);
    }
  }, [
    user,
    isLoading,
    isAuthenticated,
    hasAllowedRole,
    router,
    locale,
    redirectTo,
  ]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-zinc-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated or not allowed
  if (!isAuthenticated || (user && !hasAllowedRole)) {
    return null;
  }

  return <>{children}</>;
}

// Specific wrapper for seller dashboard
export function SellerProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={[Role.ADMIN, Role.SELLER]}>
      {children}
    </ProtectedRoute>
  );
}

// Wrapper for dashboard (all authenticated users)
// Regular users can access profile, my-orders, wishlist, addresses
// Sellers get additional store management features
// Couriers get delivery management features
export function DashboardProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute
      allowedRoles={[Role.ADMIN, Role.SELLER, Role.COURIER, Role.USER]}
    >
      {children}
    </ProtectedRoute>
  );
}
