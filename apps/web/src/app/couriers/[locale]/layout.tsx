'use client';

import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from '../../../contexts/AuthContext';
import { CartProvider } from '../../../contexts/CartContext';
import { ThemeProvider } from '../../../components/theme/ThemeProvider';

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
      <head>
        {/* Prevent theme flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <NextIntlClientProvider locale={locale} messages={localeMessages}>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900">
                  {children}
                </div>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
