import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '../../i18n/routing';
import { ClientProviders } from '../../components/layout/ClientProviders';
import { ConditionalLayout } from '../../components/layout/ConditionalLayout';

type Params = Promise<{ locale: string }>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const { locale } = await params;

  // Validate locale before trying to import messages
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return {
      title: 'ShopIt',
      description: 'Create your online store',
    };
  }

  const messages = (await import(`../../messages/${locale}.json`)).default;

  return {
    title: messages.metadata.title,
    description: messages.metadata.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Params;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // Enable static rendering
  setRequestLocale(locale);

  // Providing all messages to the client
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ClientProviders>
        <ConditionalLayout>{children}</ConditionalLayout>
      </ClientProviders>
    </NextIntlClientProvider>
  );
}
