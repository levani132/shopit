import { notFound } from 'next/navigation';
import {
  getStoreBySubdomain,
  getHomepageProducts,
  StoreData,
  HomepageProduct,
} from '../../../../lib/api';
import { getStoreBySubdomain as getMockStore } from '../../../../data/mock-stores';
import { StoreHero } from '../../../../components/store/StoreHero';
import { HomepageProducts } from '../../../../components/store/HomepageProducts';
import { getLatinInitial } from '../../../../lib/utils';

interface StorePageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

// Helper to get localized content
function getLocalizedText(
  localized: { ka?: string; en?: string } | undefined,
  fallback: string | undefined,
  locale: string
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback || '';
  }
  return fallback || '';
}

// Type for the store hero component
interface StoreForHero {
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  useDefaultCover?: boolean;
  authorName?: string;
  showAuthorName?: boolean;
  accentColor: string;
  initial?: string; // Pre-computed English initial for avatar display
  authorInitial?: string; // Pre-computed English initial for author avatar
}

async function getStoreData(subdomain: string): Promise<{
  store: StoreData | null;
  isMock: boolean;
}> {
  // Try to fetch from API first
  const apiStore = await getStoreBySubdomain(subdomain);

  if (apiStore) {
    return {
      store: apiStore,
      isMock: false,
    };
  }

  // Fallback to mock data for development
  const mockStore = getMockStore(subdomain);

  if (mockStore) {
    return {
      store: {
        id: mockStore.subdomain,
        subdomain: mockStore.subdomain,
        name: mockStore.name,
        description: mockStore.description,
        logo: mockStore.logo,
        coverImage: mockStore.coverImage,
        brandColor: mockStore.accentColor,
        accentColor: mockStore.accentColor,
        useInitialAsLogo: !mockStore.logo,
        useDefaultCover: !mockStore.coverImage,
        authorName: mockStore.owner.name,
        showAuthorName: true,
        categories: mockStore.categories,
        isVerified: false,
        homepageProductOrder: 'popular',
      },
      isMock: true,
    };
  }

  return { store: null, isMock: false };
}

export default async function StorePage({ params }: StorePageProps) {
  const { subdomain, locale } = await params;

  const { store, isMock } = await getStoreData(subdomain);

  if (!store) {
    notFound();
  }

  // Fetch homepage products
  let homepageProducts: HomepageProduct[] = [];
  let hasMoreProducts = false;

  if (!isMock && store.id) {
    const productOrder = store.homepageProductOrder || 'popular';
    const result = await getHomepageProducts(store.id, productOrder, 8);
    homepageProducts = result.products;
    hasMoreProducts = result.hasMore;
  }

  // Get localized content based on locale
  const localizedName = getLocalizedText(store.nameLocalized, store.name, locale);
  const localizedDescription = getLocalizedText(store.descriptionLocalized, store.description, locale);
  const localizedAuthorName = getLocalizedText(store.authorNameLocalized, store.authorName, locale);

  // Pre-compute initial from English name (for consistent display across locales)
  const englishName = store.nameLocalized?.en || store.name || subdomain;
  const storeInitial = getLatinInitial(englishName, subdomain.charAt(0).toUpperCase());

  // Pre-compute author initial from English author name
  const englishAuthorName = store.authorNameLocalized?.en || store.authorName || '';
  const authorInitial = getLatinInitial(englishAuthorName, storeInitial);

  // Transform store data for components
  const storeForHero: StoreForHero = {
    name: localizedName,
    description: localizedDescription,
    logo: store.logo,
    coverImage: store.coverImage,
    useDefaultCover: store.useDefaultCover,
    authorName: localizedAuthorName,
    showAuthorName: store.showAuthorName,
    accentColor: store.accentColor,
    initial: storeInitial,
    authorInitial,
  };

  return (
    <>
      <StoreHero store={storeForHero} locale={locale} />
      <HomepageProducts
        products={homepageProducts}
        hasMore={hasMoreProducts}
        locale={locale}
        subdomain={subdomain}
        storeId={store.id}
        storeName={localizedName}
      />
    </>
  );
}

export async function generateMetadata({ params }: StorePageProps) {
  const { subdomain, locale } = await params;
  const { store } = await getStoreData(subdomain);

  if (!store) {
    return {
      title: 'Store Not Found',
    };
  }

  const name = getLocalizedText(store.nameLocalized, store.name, locale);
  const description = getLocalizedText(store.descriptionLocalized, store.description, locale);

  return {
    title: name,
    description: description,
  };
}

