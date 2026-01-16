'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Admin overview has been merged into the main dashboard overview
// This page redirects to the main dashboard
export default function AdminPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-500)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">
          Redirecting to Dashboard...
        </p>
      </div>
    </div>
  );
}
