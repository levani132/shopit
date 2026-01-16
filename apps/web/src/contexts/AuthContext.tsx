'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { useRouter } from 'next/navigation';
import { Role, RoleValue, hasAnyRole } from '@sellit/constants';

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: number; // Bitmask-based role
  phoneNumber?: string;
  identificationNumber?: string;
  accountNumber?: string;
  beneficiaryBankCode?: string;
  isProfileComplete?: boolean;
  authProvider?: 'EMAIL' | 'GOOGLE';
  // Courier-specific fields
  vehicleType?: string;
  workingAreas?: string[];
  isCourierApproved?: boolean;
  // Balance fields (for sellers and couriers)
  balance?: number;
  pendingWithdrawals?: number;
  totalEarnings?: number;
  totalWithdrawn?: number;
}

export interface Store {
  id: string;
  subdomain: string;
  name: string;
  brandColor: string;
  description?: string;
}

interface AuthState {
  user: User | null;
  store: Store | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: (logoutAllDevices?: boolean) => Promise<void>;
  refreshAuth: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Build API base URL - strip any existing prefix to avoid duplication
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const API_URL = API_BASE.replace(/\/api\/v1\/?$/, '').replace(/\/$/, '');

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<AuthState>({
    user: null,
    store: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const router = useRouter();

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // API helper
  const apiCall = async (
    endpoint: string,
    options: RequestInit = {},
  ): Promise<Response> => {
    const url = `${API_URL}/api/v1${endpoint}`;
    return fetch(url, {
      ...options,
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  };

  // Check authentication status
  const checkAuth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiCall('/auth/me');

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setState({
            user: data.user,
            store: data.store,
            isLoading: false,
            isAuthenticated: true,
          });
          return true;
        }
      }

      // Try to refresh token
      const refreshResponse = await apiCall('/auth/refresh', {
        method: 'POST',
      });

      if (refreshResponse.ok) {
        // Retry getting user
        const retryResponse = await apiCall('/auth/me');
        if (retryResponse.ok) {
          const data = await retryResponse.json();
          if (data.user) {
            setState({
              user: data.user,
              store: data.store,
              isLoading: false,
              isAuthenticated: true,
            });
            return true;
          }
        }
      }

      // Not authenticated
      setState({
        user: null,
        store: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    } catch (error) {
      console.error('Auth check failed:', error);
      setState({
        user: null,
        store: null,
        isLoading: false,
        isAuthenticated: false,
      });
      return false;
    }
  }, []);

  // Login
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const response = await apiCall('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Login failed');
        }

        const data = await response.json();

        setState({
          user: data.user,
          store: data.store,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch (error) {
        setState((prev) => ({ ...prev, isLoading: false }));
        throw error;
      }
    },
    [],
  );

  // Logout
  const logout = useCallback(
    async (logoutAllDevices = false): Promise<void> => {
      try {
        await apiCall('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ logoutAllDevices }),
        });
      } catch (error) {
        console.error('Logout error:', error);
      }

      setState({
        user: null,
        store: null,
        isLoading: false,
        isAuthenticated: false,
      });

      router.push('/');
    },
    [router],
  );

  // Refresh auth
  const refreshAuth = useCallback(async (): Promise<void> => {
    await checkAuth();
  }, [checkAuth]);

  // Check auth on mount (only on client)
  useEffect(() => {
    if (mounted) {
      checkAuth();
    }
  }, [mounted, checkAuth]);

  // Memoize context value
  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      refreshAuth,
      checkAuth,
    }),
    [state, login, logout, refreshAuth, checkAuth],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Default context for SSR fallback
const defaultAuthContext: AuthContextType = {
  user: null,
  store: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {
    /* empty */
  },
  logout: async () => {
    /* empty */
  },
  refreshAuth: async () => {
    /* empty */
  },
  checkAuth: async () => false,
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  // Return default context if not within provider (SSR fallback)
  if (context === undefined) {
    return defaultAuthContext;
  }
  return context;
}

/**
 * Hook to check if user has any of the required roles (bitmask-based)
 * @param allowedRoles - Array of role values to check
 */
export function useRequireRole(allowedRoles: RoleValue[]) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user && !hasAnyRole(user.role, allowedRoles)) {
      router.push('/');
    }
  }, [user, isLoading, isAuthenticated, allowedRoles, router]);

  return {
    isAllowed: user ? hasAnyRole(user.role, allowedRoles) : false,
    isLoading,
  };
}

/**
 * Hook specifically for seller dashboard
 * Requires SELLER role
 */
export function useRequireSeller() {
  return useRequireRole([Role.SELLER]);
}

/**
 * Hook specifically for courier dashboard
 * Requires COURIER role
 */
export function useRequireCourier() {
  return useRequireRole([Role.COURIER]);
}

/**
 * Hook specifically for admin dashboard
 * Requires ADMIN role
 */
export function useRequireAdmin() {
  return useRequireRole([Role.ADMIN]);
}
