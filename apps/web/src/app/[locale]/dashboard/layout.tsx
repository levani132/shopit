'use client';

import { useEffect } from 'react';
import { DashboardSidebar } from '../../../components/dashboard/DashboardSidebar';
import { DashboardHeader } from '../../../components/dashboard/DashboardHeader';
import { DashboardProtectedRoute } from '../../../components/auth/ProtectedRoute';
import { useAuth } from '../../../contexts/AuthContext';
import { getAccentColorCssVars, AccentColorName } from '@sellit/constants';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { store, isLoading } = useAuth();

  // Get accent colors based on store's brand color (default to indigo)
  const brandColor = (store?.brandColor || 'indigo') as AccentColorName;

  // Debug logging
  console.log('[Dashboard Layout] Auth state:', {
    isLoading,
    storeExists: !!store,
    storeData: store,
    brandColor: store?.brandColor,
    computedBrandColor: brandColor,
  });

  // Set CSS variables on document root
  // AccentColorProvider skips dashboard pages, so we're in control here
  useEffect(() => {
    console.log('[Dashboard Layout] Setting accent colors for:', brandColor);
    const accentColors = getAccentColorCssVars(brandColor, '--accent');
    console.log('[Dashboard Layout] CSS vars:', accentColors);

    // Apply to document root
    Object.entries(accentColors).forEach(([varName, value]) => {
      document.documentElement.style.setProperty(varName, value);
    });
  }, [brandColor]);

  return (
    <DashboardProtectedRoute>
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col">
        {/* Header - Full width at top */}
        <DashboardHeader />

        {/* Below header: Sidebar + Content */}
        <div className="flex flex-1">
          {/* Desktop Sidebar */}
          <DashboardSidebar />

          {/* Page Content */}
          <main className="flex-1 p-4 lg:p-8 min-w-0">{children}</main>
        </div>
      </div>
    </DashboardProtectedRoute>
  );
}
