import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import {
  getStoreBySubdomain as getStoreFromApi,
  getCategoriesByStoreId,
  CategoryData,
} from '../../../../../lib/api';
import { getStoreBySubdomain as getMockStore } from '../../../../../data/mock-stores';
import { getAccentColorCssVars, AccentColorName } from '@shopit/constants';
import { getLatinInitial } from '../../../../../lib/utils';
import { getLocalizedText } from '../../../../../store-templates';
import { resolveTemplate } from '../../../../../lib/resolve-template';
import { TemplateProvider } from '../../../../../store-templates/TemplateContext';

interface MainStoreLayoutProps {
  children: React.ReactNode;
  params: Promise<{ subdomain: string; locale: string }>;
}

async function getStoreData(subdomain: string, locale: string) {
  const apiStore = await getStoreFromApi(subdomain);
  if (apiStore) {
    const categories = await getCategoriesByStoreId(apiStore.id);

    const englishName =
      apiStore.nameLocalized?.en || apiStore.name || subdomain;
    const initial = getLatinInitial(
      englishName,
      subdomain.charAt(0).toUpperCase(),
    );

    const englishAuthorName =
      apiStore.authorNameLocalized?.en || apiStore.authorName || '';
    const authorInitial = getLatinInitial(englishAuthorName, initial);

    return {
      id: apiStore.id,
      name: getLocalizedText(apiStore.nameLocalized, apiStore.name, locale),
      subdomain: apiStore.subdomain,
      description: getLocalizedText(
        apiStore.descriptionLocalized,
        apiStore.description,
        locale,
      ),
      logo: apiStore.logo,
      brandColor: apiStore.brandColor,
      accentColor: apiStore.brandColor,
      authorName: getLocalizedText(
        apiStore.authorNameLocalized,
        apiStore.authorName,
        locale,
      ),
      showAuthorName: apiStore.showAuthorName,
      phone: apiStore.phone,
      email: apiStore.email,
      address: apiStore.address,
      socialLinks: apiStore.socialLinks,
      categories,
      initial,
      authorInitial,
      templateId: (apiStore as any).templateId as string | undefined,
      templateBundleUrl: (apiStore as any).templateBundleUrl as string | undefined,
      templateConfig: (apiStore as any).templateConfig as Record<string, unknown> | undefined,
    };
  }

  const mockStore = getMockStore(subdomain);
  if (mockStore) {
    const initial = getLatinInitial(
      mockStore.name,
      subdomain.charAt(0).toUpperCase(),
    );
    const authorInitial = getLatinInitial(mockStore.owner.name, initial);

    return {
      id: mockStore.subdomain,
      name: mockStore.name,
      subdomain: mockStore.subdomain,
      description: mockStore.description,
      logo: mockStore.logo,
      brandColor: mockStore.accentColor,
      accentColor: mockStore.accentColor,
      authorName: mockStore.owner.name,
      showAuthorName: true,
      phone: undefined,
      email: undefined,
      address: undefined,
      socialLinks: undefined,
      categories: [] as CategoryData[],
      initial,
      authorInitial,
      templateId: undefined as string | undefined,
      templateConfig: undefined as Record<string, unknown> | undefined,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: MainStoreLayoutProps): Promise<Metadata> {
  const { subdomain, locale } = await params;
  const store = await getStoreData(subdomain, locale);

  return {
    title: store?.name || 'Store',
    description: store?.description || 'Welcome to our store',
  };
}

export default async function MainStoreLayout({
  children,
  params,
}: MainStoreLayoutProps) {
  const { subdomain, locale } = await params;

  const store = await getStoreData(subdomain, locale);

  if (!store) {
    notFound();
  }

  const accentColors = getAccentColorCssVars(
    store.accentColor as AccentColorName,
  );

  const templateId = store.templateId || 'default';
  const template = await resolveTemplate(templateId, store.templateBundleUrl);
  const LayoutWrapper = template.layout.wrapper;

  const storeForComponents = {
    id: store.id,
    name: store.name,
    subdomain: store.subdomain,
    description: store.description,
    logo: store.logo,
    authorName: store.authorName,
    showAuthorName: store.showAuthorName,
    phone: store.phone,
    email: store.email,
    address: store.address,
    socialLinks: store.socialLinks,
    categories: store.categories,
    initial: store.initial,
    authorInitial: store.authorInitial,
  };

  return (
    <TemplateProvider
      templateId={templateId}
      templateConfig={store.templateConfig}
    >
      <LayoutWrapper
        store={storeForComponents}
        accentColors={accentColors as React.CSSProperties}
        locale={locale}
      >
        {children}
      </LayoutWrapper>
    </TemplateProvider>
  );
}

