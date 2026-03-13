import { getStoreBySubdomain } from '../../../../../../lib/api';
import { getTemplate } from '../../../../../../store-templates';
import SharedRegisterPage from '../../../../../../store-templates/shared/SharedRegisterPage';

interface RegisterPageProps {
  params: Promise<{ subdomain: string; locale: string }>;
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { subdomain, locale } = await params;
  const store = await getStoreBySubdomain(subdomain);
  const template = getTemplate((store as any)?.templateId);
  const RegisterComponent =
    template.optionalPages?.register ?? SharedRegisterPage;
  return <RegisterComponent locale={locale} subdomain={subdomain} />;
}
