import { notFound } from 'next/navigation';
import {
  getStoreWithProducts,
  StoreData,
  ProductData,
} from '../../../../lib/api';
import { getStoreBySubdomain as getMockStore } from '../../../../data/mock-stores';
import { StoreHero } from '../../../../components/store/StoreHero';
import { StoreCategories } from '../../../../components/store/StoreCategories';
import { StoreProducts } from '../../../../components/store/StoreProducts';

interface StorePageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

// Type for the store hero component
interface StoreForHero {
  name: string;
  description?: string;
  logo?: string;
  authorName?: string;
  showAuthorName?: boolean;
  accentColor: string;
}

// Type for products component
interface ProductForDisplay {
  id: string;
  name: string;
  category?: string;
  price: number;
  images?: string[];
}

async function getStoreData(subdomain: string): Promise<{
  store: StoreData | null;
  products: ProductData[];
  isMock: boolean;
}> {
  // Try to fetch from API first
  const apiData = await getStoreWithProducts(subdomain);

  if (apiData) {
    return {
      store: apiData.store,
      products: apiData.products,
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
        brandColor: mockStore.accentColor,
        accentColor: mockStore.accentColor,
        useInitialAsLogo: !mockStore.logo,
        authorName: mockStore.owner,
        showAuthorName: true,
        categories: mockStore.categories.map((c) => c.name),
        isVerified: false,
      },
      products: mockStore.products.map((p) => ({
        id: p.id,
        name: p.name,
        description: '',
        price: p.price,
        images: p.image ? [p.image] : [],
        category: p.category,
        inStock: true,
      })),
      isMock: true,
    };
  }

  return { store: null, products: [], isMock: false };
}

export default async function StorePage({ params }: StorePageProps) {
  const { subdomain } = await params;

  const { store, products } = await getStoreData(subdomain);

  if (!store) {
    notFound();
  }

  // Transform store data for components
  const storeForHero: StoreForHero = {
    name: store.name,
    description: store.description,
    logo: store.logo,
    authorName: store.authorName,
    showAuthorName: store.showAuthorName,
    accentColor: store.accentColor,
  };

  const productsForDisplay: ProductForDisplay[] = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: p.price,
    images: p.images,
  }));

  return (
    <>
      <StoreHero store={storeForHero} />
      <StoreCategories categories={store.categories} />
      <StoreProducts products={productsForDisplay} />
    </>
  );
}

export async function generateMetadata({ params }: StorePageProps) {
  const { subdomain } = await params;
  const { store } = await getStoreData(subdomain);

  if (!store) {
    return {
      title: 'Store Not Found',
    };
  }

  return {
    title: store.name,
    description: store.description,
  };
}

