'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../store-templates';

export default function StoreProductsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const ProductsComponent = template.pages.products;
  return <ProductsComponent locale={locale} subdomain={subdomain} />;
}
