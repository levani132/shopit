import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '../../../../components/theme/ThemeProvider';
import { AuthProvider } from '../../../../contexts/AuthContext';
import { StoreEditProvider } from '../../../../contexts/StoreEditContext';
import { CartProvider } from '../../../../contexts/CartContext';
import { CheckoutProvider } from '../../../../contexts/CheckoutContext';
import { routing } from '../../../../i18n/routing';
import '../../../global.css';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: StoreLayoutProps): Promise<Metadata> {
  const { subdomain } = await params;

  return {
    title: subdomain,
    description: 'Welcome to our store',
  };
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as 'en' | 'ka')) {
    notFound();
  }

  // Load messages for translations
  const messages = (await import(`../../../../messages/${locale}.json`))
    .default;

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Prevent theme flash - runs before React hydrates */}
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
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <StoreEditProvider>
                <CartProvider>
                  <CheckoutProvider>{children}</CheckoutProvider>
                </CartProvider>
              </StoreEditProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
