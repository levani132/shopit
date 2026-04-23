import { setRequestLocale } from 'next-intl/server';
import { Hero } from '../../components/home/Hero';
import { FeaturedStores } from '../../components/home/FeaturedStores';
import { HowItWorks } from '../../components/home/HowItWorks';
import { PaymentMethods } from '../../components/home/PaymentMethods';
import { Delivery } from '../../components/home/Delivery';
import { Analytics } from '../../components/home/Analytics';
import { ComingSoonBanner } from '../../components/home/ComingSoonBanner';

type Params = Promise<{ locale: string }>;

export default async function HomePage({ params }: { params: Params }) {
  const { locale } = await params;

  // Enable static rendering
  setRequestLocale(locale);

  return (
    <>
      <ComingSoonBanner />
      <Hero />
      <FeaturedStores />
      <HowItWorks />
      <PaymentMethods />
      <Delivery />
      <Analytics />
    </>
  );
}
