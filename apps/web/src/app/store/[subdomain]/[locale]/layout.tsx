import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { getStoreBySubdomain as getStoreFromApi } from '../../../../lib/api';
import { getStoreBySubdomain as getMockStore } from '../../../../data/mock-stores';
import { StoreHeader } from '../../../../components/store/StoreHeader';
import { StoreFooter } from '../../../../components/store/StoreFooter';
import { ThemeProvider } from '../../../../components/theme/ThemeProvider';
import { routing } from '../../../../i18n/routing';
import { getAccentColorCssVars, AccentColorName } from '@sellit/constants';
import '../../../global.css';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string; locale: string }>;
}

// Helper to get store data from API or fallback to mock
async function getStoreData(subdomain: string) {
  // Try API first
  const apiStore = await getStoreFromApi(subdomain);
  if (apiStore) {
    return {
      name: apiStore.name,
      subdomain: apiStore.subdomain,
      description: apiStore.description,
      logo: apiStore.logo,
      brandColor: apiStore.brandColor,
      accentColor: apiStore.brandColor, // Use brandColor as accentColor key
      authorName: apiStore.authorName,
      showAuthorName: apiStore.showAuthorName,
    };
  }

  // Fallback to mock
  const mockStore = getMockStore(subdomain);
  if (mockStore) {
    return {
      name: mockStore.name,
      subdomain: mockStore.subdomain,
      description: mockStore.description,
      logo: mockStore.logo,
      brandColor: mockStore.accentColor,
      accentColor: mockStore.accentColor,
      authorName: mockStore.owner.name,
      showAuthorName: true,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: StoreLayoutProps): Promise<Metadata> {
  const { subdomain } = await params;
  const store = await getStoreData(subdomain);

  return {
    title: store?.name || 'Store',
    description: store?.description || 'Welcome to our store',
  };
}

export default async function StoreLayout({
  children,
  params,
}: StoreLayoutProps) {
  const { subdomain, locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as 'en' | 'ka')) {
    notFound();
  }

  // Get store data
  const store = await getStoreData(subdomain);

  if (!store) {
    notFound();
  }

  // Get accent colors for this store
  const accentColors = getAccentColorCssVars(store.accentColor as AccentColorName);

  // Store data for header/footer
  const storeForComponents = {
    name: store.name,
    subdomain: store.subdomain,
    description: store.description,
    logo: store.logo,
    authorName: store.authorName,
    showAuthorName: store.showAuthorName,
  };

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
        <ThemeProvider>
          <div
            className="min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-900"
            style={accentColors as React.CSSProperties}
          >
            <StoreHeader store={storeForComponents} />
            <main className="flex-1">{children}</main>
            <StoreFooter store={storeForComponents} />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
