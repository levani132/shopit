'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../store-templates';
import SharedWishlistPage from '../../../../../../store-templates/shared/SharedWishlistPage';

export default function StoreWishlistPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const WishlistComponent = template.optionalPages?.wishlist ?? SharedWishlistPage;
  return <WishlistComponent locale={locale} subdomain={subdomain} />;
}
