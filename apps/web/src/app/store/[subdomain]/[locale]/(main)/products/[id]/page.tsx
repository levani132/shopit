'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../../store-templates';

export default function ProductDetailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const productId = params?.id as string;
  const template = useTemplate();
  const ProductDetailComponent = template.pages.productDetail;
  return <ProductDetailComponent locale={locale} subdomain={subdomain} productId={productId} />;
}
