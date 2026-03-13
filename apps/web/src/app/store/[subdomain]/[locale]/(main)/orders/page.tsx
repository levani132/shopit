'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../store-templates';
import SharedOrdersPage from '../../../../../../store-templates/shared/SharedOrdersPage';

export default function OrdersPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const OrdersComponent = template.optionalPages?.orders ?? SharedOrdersPage;
  return <OrdersComponent locale={locale} subdomain={subdomain} />;
}
