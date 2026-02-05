import { notFound } from 'next/navigation';
import { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { ThemeProvider } from '../../../../components/theme/ThemeProvider';
import { AuthProvider } from '../../../../contexts/AuthContext';
import { StoreEditProvider } from '../../../../contexts/StoreEditContext';
import { CartProvider } from '../../../../contexts/CartContext';
import { CheckoutProvider } from '../../../../contexts/CheckoutContext';
import { routing } from '../../../../i18n/routing';
import { inter, notoSansGeorgian } from '../../../fonts';
import { getStoreBySubdomain } from '../../../../lib/api';
import {
  buildTenantConfig,
  getTenantIconPaths,
  getTenantCssVariables,
  mapToAccentColor,
} from '../../../../lib/tenant-config';
import '../../../global.css';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string; locale: string }>;
}

export async function generateMetadata({
  params,
}: StoreLayoutProps): Promise<Metadata> {
  const { subdomain } = await params;

  // Fetch store data for proper metadata
  const store = await getStoreBySubdomain(subdomain);

  // Build tenant config
  const tenantConfig = buildTenantConfig(
    subdomain,
    store?.name,
    store?.brandColor,
  );

  // Get icon paths for this tenant
  const colorName = mapToAccentColor(store?.brandColor);
  const iconPaths = getTenantIconPaths(colorName);

  const title = store?.name || subdomain;
  const description = store?.description || `Welcome to ${title}`;

  return {
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    // PWA metadata
    applicationName: `${tenantConfig.displayName} • ShopIt`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: tenantConfig.displayName,
    },
    formatDetection: {
      telephone: true,
    },
    // Icons
    icons: {
      // Favicon - multi-resolution ICO
      icon: [
        { url: iconPaths.favicon.ico, sizes: 'any' },
        { url: iconPaths.favicon['32x32'], sizes: '32x32', type: 'image/png' },
        { url: iconPaths.favicon['16x16'], sizes: '16x16', type: 'image/png' },
      ],
      // Apple touch icon - using largest available for best quality
      // iOS will automatically scale down. Using 1024x1024 for retina displays.
      // Standard size is 180x180 but larger works better for retina.
      apple: [
        {
          url: iconPaths.ios['1024x1024'],
          sizes: '1024x1024',
          type: 'image/png',
        },
      ],
      // Shortcut icon
      shortcut: iconPaths.favicon.ico,
    },
    // PWA manifest - points to the dynamic manifest for this store
    manifest: '/manifest.webmanifest',
    // Open Graph
    openGraph: {
      title,
      description,
      siteName: `${title} • ShopIt`,
      locale: 'ka_GE',
      type: 'website',
    },
  };
}

/**
 * Viewport configuration with dynamic theme color
 * Supports light/dark mode via media query
 */
export async function generateViewport({
  params,
}: StoreLayoutProps): Promise<Viewport> {
  const { subdomain } = await params;

  // Fetch store data for theme color
  const store = await getStoreBySubdomain(subdomain);
  const tenantConfig = buildTenantConfig(
    subdomain,
    store?.name,
    store?.brandColor,
  );

  // Theme color - using 600 shade for good visibility
  const themeColor = tenantConfig.colors[600];

  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    themeColor: [
      { media: '(prefers-color-scheme: light)', color: themeColor },
      { media: '(prefers-color-scheme: dark)', color: '#18181b' }, // zinc-900
    ],
  };
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { locale, subdomain } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as 'en' | 'ka')) {
    notFound();
  }

  // Fetch store data for CSS variables
  const store = await getStoreBySubdomain(subdomain);
  const tenantConfig = buildTenantConfig(
    subdomain,
    store?.name,
    store?.brandColor,
  );
  const cssVariables = getTenantCssVariables(tenantConfig);

  // Load messages for translations
  const messages = (await import(`../../../../messages/${locale}.json`))
    .default;

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${notoSansGeorgian.variable}`}
      suppressHydrationWarning
    >
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
        {/* Inject tenant-specific CSS custom properties */}
        <style
          dangerouslySetInnerHTML={{ __html: `:root { ${cssVariables} }` }}
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
