'use client';

import { usePathname } from 'next/navigation';
import { StoreHeader } from './StoreHeader';
import { StoreFooter } from './StoreFooter';

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
    name: string;
    subdomain: string;
    description?: string;
    logo?: string;
    authorName?: string;
    showAuthorName?: boolean;
    phone?: string;
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
}

export function StoreLayoutContent({
  children,
  store,
  accentColors,
}: StoreLayoutContentProps) {
  const pathname = usePathname();

  // Check if current path is an auth route
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname?.endsWith(route));

  return (
    <div
      className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-900"
      style={accentColors}
    >
      {!isAuthRoute && <StoreHeader store={store} />}
      <main className="flex-1">{children}</main>
      {!isAuthRoute && <StoreFooter store={store} />}
    </div>
  );
}
