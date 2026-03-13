'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../store-templates';
import SharedCartPage from '../../../../../../store-templates/shared/SharedCartPage';

export default function CartPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const CartComponent = template.optionalPages?.cart ?? SharedCartPage;
  return <CartComponent locale={locale} subdomain={subdomain} />;
}
