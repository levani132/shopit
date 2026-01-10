'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../contexts/AuthContext';

export default function RegisterCompletePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, user } = useAuth();

  useEffect(() => {
    // Wait for auth to load
    if (isLoading) return;

    if (!isAuthenticated) {
      // Not authenticated, redirect to register
      router.push('/register');
      return;
    }

    // Check if profile is complete
    if (user?.isProfileComplete) {
      // Profile already complete, go to dashboard
      router.push('/dashboard');
    } else {
      // Profile needs completion, redirect to dashboard profile page
      router.push('/dashboard/profile');
    }
  }, [isAuthenticated, isLoading, user, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
