'use client';

import { StoreHero } from '../../../components/store/StoreHero';
import { HomepageProducts } from '../../../components/store/HomepageProducts';
import type { HomePageProps } from '../../types';

export default function DefaultHomePage({
  store,
  products,
  hasMoreProducts,
  locale,
  subdomain,
  storeInitial,
  authorInitial,
}: HomePageProps) {
  const storeForHero = {
    name: store.name,
    description: store.description,
    logo: store.logo,
    coverImage: store.coverImage,
    useDefaultCover: store.useDefaultCover,
    authorName: store.authorName,
    showAuthorName: store.showAuthorName,
    accentColor: store.accentColor,
    initial: storeInitial,
    authorInitial,
  };

  return (
    <>
      <StoreHero store={storeForHero} locale={locale} />
      <HomepageProducts
        products={products}
        hasMore={hasMoreProducts}
        locale={locale}
        subdomain={subdomain}
        storeId={store.id}
        storeName={store.name}
      />
    </>
  );
}
