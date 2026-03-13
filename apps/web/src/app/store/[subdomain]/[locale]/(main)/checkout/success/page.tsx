'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useTemplate } from '../../../../../../../store-templates';
import SharedCheckoutSuccess from '../../../../../../../store-templates/shared/SharedCheckoutSuccess';

export default function CheckoutSuccessPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const orderId = searchParams.get('orderId');
  const template = useTemplate();
  const SuccessComponent = template.optionalPages?.checkoutSuccess ?? SharedCheckoutSuccess;
  return <SuccessComponent locale={locale} subdomain={subdomain} orderId={orderId} />;
}
