import { notFound } from 'next/navigation';
import { getStoreBySubdomain } from '../../../../data/mock-stores';
import { StoreHero } from '../../../../components/store/StoreHero';
import { StoreCategories } from '../../../../components/store/StoreCategories';
import { StoreProducts } from '../../../../components/store/StoreProducts';

interface StorePageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

export default async function StorePage({ params }: StorePageProps) {
  const { subdomain } = await params;

  // Get store data
  const store = getStoreBySubdomain(subdomain);

  if (!store) {
    notFound();
  }

  return (
    <>
      <StoreHero store={store} />
      <StoreCategories categories={store.categories} />
      <StoreProducts products={store.products} />
    </>
  );
}

export async function generateMetadata({ params }: StorePageProps) {
  const { subdomain } = await params;
  const store = getStoreBySubdomain(subdomain);

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

