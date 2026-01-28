'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';
import { useStoreEditOptional } from '../../contexts/StoreEditContext';
import { StoreEditModeToggle } from './StoreEditModeToggle';

// Routes that should NOT show header/footer (auth pages)
const AUTH_ROUTES = ['/login', '/register'];

interface SubcategoryData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
}

interface CategoryData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  slug: string;
  subcategories: SubcategoryData[];
}

interface StoreLayoutContentProps {
  children: React.ReactNode;
  store: {
    id?: string; // Store ID for edit context
    name: string;
    subdomain: string;
    description?: string;
    logo?: string;
    authorName?: string;
    showAuthorName?: boolean;
    phone?: string;
    email?: string;
    address?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
    };
    categories?: CategoryData[];
    initial?: string; // Pre-computed English initial for avatar display
    authorInitial?: string; // Pre-computed English initial for author avatar
  };
  accentColors: React.CSSProperties;
  locale: string;
}

export function StoreLayoutContent({
  children,
  store,
  accentColors,
  locale,
}: StoreLayoutContentProps) {
  const pathname = usePathname();
  const storeEdit = useStoreEditOptional();

  // Set the viewing store for edit context
  useEffect(() => {
    if (storeEdit && store.id) {
      storeEdit.setViewingStore(store.id, store.subdomain);
    }
    return () => {
      if (storeEdit) {
        storeEdit.setViewingStore(null, null);
      }
    };
  }, [storeEdit, store.id, store.subdomain]);

  // Check if current path is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.endsWith(route));

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-900"
      style={accentColors}
    >
      {!isAuthRoute && <StoreHeader store={store} />}
      <main className="flex-1">{children}</main>
      {!isAuthRoute && <StoreFooter store={store} locale={locale} />}
      
      {/* Edit mode toggle for store owner */}
      <StoreEditModeToggle />
    </div>
  );
}
