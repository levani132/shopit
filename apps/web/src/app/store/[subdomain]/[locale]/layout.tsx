import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
  getStoreBySubdomain as getStoreFromApi,
  getCategoriesByStoreId,
  LocalizedText,
  CategoryData,
} from '../../../../lib/api';
import { getStoreBySubdomain as getMockStore } from '../../../../data/mock-stores';
import { StoreLayoutContent } from '../../../../components/store/StoreLayoutContent';
import { ThemeProvider } from '../../../../components/theme/ThemeProvider';
import { AuthProvider } from '../../../../contexts/AuthContext';
import { CartProvider } from '../../../../contexts/CartContext';
import { routing } from '../../../../i18n/routing';
import { getAccentColorCssVars, AccentColorName } from '@sellit/constants';
import '../../../global.css';

interface StoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string; locale: string }>;
}

// Helper to get localized text
function getLocalizedText(
  localized: LocalizedText | undefined,
  fallback: string | undefined,
  locale: string,
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback || '';
  }
  return fallback || '';
}

// Helper to get store data from API or fallback to mock
async function getStoreData(subdomain: string, locale: string) {
  // Try API first
  const apiStore = await getStoreFromApi(subdomain);
  if (apiStore) {
    // Fetch categories for this store
    const categories = await getCategoriesByStoreId(apiStore.id);

    return {
      id: apiStore.id,
      name: getLocalizedText(apiStore.nameLocalized, apiStore.name, locale),
      subdomain: apiStore.subdomain,
      description: getLocalizedText(
        apiStore.descriptionLocalized,
        apiStore.description,
        locale,
      ),
      logo: apiStore.logo,
      brandColor: apiStore.brandColor,
      accentColor: apiStore.brandColor, // Use brandColor as accentColor key
      authorName: getLocalizedText(
        apiStore.authorNameLocalized,
        apiStore.authorName,
        locale,
      ),
      showAuthorName: apiStore.showAuthorName,
      phone: apiStore.phone,
      address: apiStore.address,
      socialLinks: apiStore.socialLinks,
      categories,
    };
  }

  // Fallback to mock
  const mockStore = getMockStore(subdomain);
  if (mockStore) {
    return {
      id: mockStore.subdomain, // Use subdomain as ID for mock stores
      name: mockStore.name,
      subdomain: mockStore.subdomain,
      description: mockStore.description,
      logo: mockStore.logo,
      brandColor: mockStore.accentColor,
      accentColor: mockStore.accentColor,
      authorName: mockStore.owner.name,
      showAuthorName: true,
      phone: undefined,
      address: undefined,
      socialLinks: undefined,
      categories: [] as CategoryData[],
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: StoreLayoutProps): Promise<Metadata> {
  const { subdomain, locale } = await params;
  const store = await getStoreData(subdomain, locale);

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

  // Get store data with localized content
  const store = await getStoreData(subdomain, locale);

  if (!store) {
    notFound();
  }

  // Get accent colors for this store
  const accentColors = getAccentColorCssVars(
    store.accentColor as AccentColorName,
  );

  // Load messages for translations
  const messages = (await import(`../../../../messages/${locale}.json`))
    .default;

  // Store data for header/footer
  const storeForComponents = {
    name: store.name,
    subdomain: store.subdomain,
    description: store.description,
    logo: store.logo,
    authorName: store.authorName,
    showAuthorName: store.showAuthorName,
    phone: store.phone,
    address: store.address,
    socialLinks: store.socialLinks,
    categories: store.categories,
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
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <CartProvider>
                <StoreLayoutContent
                  store={storeForComponents}
                  accentColors={accentColors as React.CSSProperties}
                >
                  {children}
                </StoreLayoutContent>
              </CartProvider>
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
