import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  getStoreBySubdomain as getStoreFromApi,
  getCategoriesByStoreId,
  LocalizedText,
  CategoryData,
} from '../../../../../lib/api';
import { getStoreBySubdomain as getMockStore } from '../../../../../data/mock-stores';
import { StoreLayoutContent } from '../../../../../components/store/StoreLayoutContent';
import { getAccentColorCssVars, AccentColorName } from '@shopit/constants';
import { getLatinInitial } from '../../../../../lib/utils';

interface MainStoreLayoutProps {
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

    // Get English name for initial (fallback to store name, then subdomain)
    const englishName =
      apiStore.nameLocalized?.en || apiStore.name || subdomain;
    const initial = getLatinInitial(
      englishName,
      subdomain.charAt(0).toUpperCase(),
    );

    // Get English author name for initial
    const englishAuthorName =
      apiStore.authorNameLocalized?.en || apiStore.authorName || '';
    const authorInitial = getLatinInitial(englishAuthorName, initial);

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
      accentColor: apiStore.brandColor,
      authorName: getLocalizedText(
        apiStore.authorNameLocalized,
        apiStore.authorName,
        locale,
      ),
      showAuthorName: apiStore.showAuthorName,
      phone: apiStore.phone,
      email: apiStore.email,
      address: apiStore.address,
      socialLinks: apiStore.socialLinks,
      categories,
      initial,
      authorInitial,
    };
  }

  // Fallback to mock
  const mockStore = getMockStore(subdomain);
  if (mockStore) {
    const initial = getLatinInitial(
      mockStore.name,
      subdomain.charAt(0).toUpperCase(),
    );
    const authorInitial = getLatinInitial(mockStore.owner.name, initial);

    return {
      id: mockStore.subdomain,
      name: mockStore.name,
      subdomain: mockStore.subdomain,
      description: mockStore.description,
      logo: mockStore.logo,
      brandColor: mockStore.accentColor,
      accentColor: mockStore.accentColor,
      authorName: mockStore.owner.name,
      showAuthorName: true,
      phone: undefined,
      email: undefined,
      address: undefined,
      socialLinks: undefined,
      categories: [] as CategoryData[],
      initial,
      authorInitial,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: MainStoreLayoutProps): Promise<Metadata> {
  const { subdomain, locale } = await params;
  const store = await getStoreData(subdomain, locale);

  return {
    title: store?.name || 'Store',
    description: store?.description || 'Welcome to our store',
  };
}

export default async function MainStoreLayout({
  children,
  params,
}: MainStoreLayoutProps) {
  const { subdomain, locale } = await params;

  // Get store data with localized content
  const store = await getStoreData(subdomain, locale);

  if (!store) {
    notFound();
  }

  // Get accent colors for this store
  const accentColors = getAccentColorCssVars(
    store.accentColor as AccentColorName,
  );

  // Store data for header/footer
  const storeForComponents = {
    name: store.name,
    subdomain: store.subdomain,
    description: store.description,
    logo: store.logo,
    authorName: store.authorName,
    showAuthorName: store.showAuthorName,
    phone: store.phone,
    email: store.email,
    address: store.address,
    socialLinks: store.socialLinks,
    categories: store.categories,
    initial: store.initial,
    authorInitial: store.authorInitial,
  };

  return (
    <StoreLayoutContent
      store={storeForComponents}
      accentColors={accentColors as React.CSSProperties}
      locale={locale}
    >
      {children}
    </StoreLayoutContent>
  );
}

