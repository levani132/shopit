import { getStoreBySubdomain } from '../../../../../../lib/api';
import { getTemplate } from '../../../../../../store-templates';
import SharedComingSoon from '../../../../../../store-templates/shared/SharedComingSoon';

interface ComingSoonPageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

export default async function ComingSoonPage({ params }: ComingSoonPageProps) {
  const { subdomain, locale } = await params;
  const store = await getStoreBySubdomain(subdomain);
  const template = getTemplate((store as any)?.templateId);
  const ComingSoonComponent = template.optionalPages?.comingSoon ?? SharedComingSoon;
  return <ComingSoonComponent locale={locale} subdomain={subdomain} />;
}
