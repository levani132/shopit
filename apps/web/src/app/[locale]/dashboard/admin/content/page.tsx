'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Redirect to the new unified settings page
export default function ContentManagementPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/admin/settings/faq');
  }, [router]);

  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-[var(--accent-500)] border-t-transparent"></div>
    </div>
  );
}
