'use client';

import { useParams } from 'next/navigation';
import { useTemplate } from '../../../../../../store-templates';

export default function AboutPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const subdomain = params?.subdomain as string;
  const template = useTemplate();
  const AboutComponent = template.pages.about;
  return <AboutComponent locale={locale} subdomain={subdomain} />;
}
