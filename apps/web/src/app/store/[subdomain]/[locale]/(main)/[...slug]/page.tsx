import { notFound } from 'next/navigation';
import { getStoreBySubdomain } from '../../../../../../lib/api';
import { getCustomPageComponent } from '../../../../../../store-templates';

interface CustomPageProps {
  params: Promise<{ subdomain: string; locale: string; slug: string[] }>;
}

export default async function TemplateCatchAllPage({ params }: CustomPageProps) {
  const { subdomain, locale, slug } = await params;

  const store = await getStoreBySubdomain(subdomain);
  const templateId = (store as any)?.templateId as string | undefined;

  const primarySlug = slug[0];
  const CustomPage = getCustomPageComponent(templateId, primarySlug);

  if (!CustomPage) {
    notFound();
  }

  return <CustomPage locale={locale} subdomain={subdomain} slug={slug} />;
}
