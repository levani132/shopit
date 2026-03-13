'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../../store-templates';
import SharedCheckoutFail from '../../../../../../../store-templates/shared/SharedCheckoutFail';

export default function CheckoutFailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const FailComponent = template.optionalPages?.checkoutFail ?? SharedCheckoutFail;
  return <FailComponent locale={locale} subdomain={subdomain} />;
}
