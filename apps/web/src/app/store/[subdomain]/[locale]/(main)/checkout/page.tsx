'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../store-templates';
import SharedCheckoutPage from '../../../../../../store-templates/shared/SharedCheckoutPage';

export default function CheckoutPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const CheckoutComponent = template.optionalPages?.checkout ?? SharedCheckoutPage;
  return <CheckoutComponent locale={locale} subdomain={subdomain} />;
}
