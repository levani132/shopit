import { ReactNode } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { AuthProvider } from '../../../contexts/AuthContext';
import { CartProvider } from '../../../contexts/CartContext';
import { ThemeProvider } from '../../../components/theme/ThemeProvider';

// Import global CSS
import '../../global.css';

interface CourierLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function CourierLayout({
  children,
  params,
}: CourierLayoutProps) {
  const { locale } = await params;
  const validLocale = locale === 'ka' || locale === 'en' ? locale : 'en';

  // Load messages dynamically
  const messages = (await import(`../../../messages/${validLocale}.json`))
    .default;

  return (
    <html lang={validLocale} suppressHydrationWarning>
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
        <NextIntlClientProvider locale={validLocale} messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>{children}</CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
