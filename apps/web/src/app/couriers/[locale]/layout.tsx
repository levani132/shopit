'use client';

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from '../../../contexts/AuthContext';
import { CartProvider } from '../../../contexts/CartContext';
import { ShopItBar } from '../../../components/ui/ShopItBar';

// Import global CSS
import '../../global.css';

// Import messages statically for client components
import enMessages from '../../../messages/en.json';
import kaMessages from '../../../messages/ka.json';

const messages: Record<string, typeof enMessages> = {
  en: enMessages,
  ka: kaMessages,
};

export default function CourierLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  const locale = params.locale || 'en';
  const localeMessages = messages[locale] || messages.en;

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={localeMessages}>
          <AuthProvider>
            <CartProvider>
              {/* ShopIt global bar - fixed at top */}
              <ShopItBar variant="standalone" showCreateShop={false} />
              {/* Spacer for fixed ShopItBar (h-10 = 40px) */}
              <div className="h-10" />
              <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
                {children}
              </div>
            </CartProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

