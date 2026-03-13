import { getStoreBySubdomain } from '../../../../../../lib/api';
import { getTemplate } from '../../../../../../store-templates';
import SharedLoginPage from '../../../../../../store-templates/shared/SharedLoginPage';

interface LoginPageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { subdomain, locale } = await params;
  const store = await getStoreBySubdomain(subdomain);
  const template = getTemplate((store as any)?.templateId);
  const LoginComponent = template.optionalPages?.login ?? SharedLoginPage;
  return <LoginComponent locale={locale} subdomain={subdomain} />;
}
