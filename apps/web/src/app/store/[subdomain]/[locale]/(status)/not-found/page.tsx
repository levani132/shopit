import { getStoreBySubdomain } from '../../../../../../lib/api';
import { getTemplate } from '../../../../../../store-templates';
import SharedNotFound from '../../../../../../store-templates/shared/SharedNotFound';

interface NotFoundPageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

export default async function StoreNotFoundPage({ params }: NotFoundPageProps) {
  const { subdomain, locale } = await params;
  const store = await getStoreBySubdomain(subdomain);
  const template = getTemplate((store as any)?.templateId);
  const NotFoundComponent = template.optionalPages?.notFound ?? SharedNotFound;
  return <NotFoundComponent locale={locale} subdomain={subdomain} />;
}
