import { setRequestLocale } from 'next-intl/server';
import { Hero } from '../../components/home/Hero';
import { FeaturedStores } from '../../components/home/FeaturedStores';
import { HowItWorks } from '../../components/home/HowItWorks';
import { Analytics } from '../../components/home/Analytics';

type Params = Promise<{ locale: string }>;

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <>
      <Hero />
      <FeaturedStores />
      <HowItWorks />
      <Analytics />
    </>
  );
}
