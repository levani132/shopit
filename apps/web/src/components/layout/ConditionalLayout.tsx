'use client';

import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Footer } from './Footer';

// Routes where Header/Footer should be hidden
const HIDE_LAYOUT_ROUTES = ['/register'];

interface ConditionalLayoutProps {
  children: React.ReactNode;
}

export function ConditionalLayout({ children }: ConditionalLayoutProps) {
  const pathname = usePathname();
  
  const shouldHideLayout = HIDE_LAYOUT_ROUTES.some((route) =>
    pathname.includes(route)
  );

  return (
    <>
      {!shouldHideLayout && <Header />}
      <main className="flex-1">{children}</main>
      {!shouldHideLayout && <Footer />}
    </>
  );
}

