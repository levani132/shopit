import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/routing';

// Placeholder stores - will be empty/mocked for now
const placeholderStores = [
  {
    id: '1',
    name: 'Fashion Store',
    subdomain: 'fashion',
    coverImage: null,
    profileImage: null,
    accentColor: '#6366f1',
  },
  {
    id: '2',
    name: 'Electronics Hub',
    subdomain: 'electronics',
    coverImage: null,
    profileImage: null,
    accentColor: '#ec4899',
  },
  {
    id: '3',
    name: 'Home & Garden',
    subdomain: 'home-garden',
    coverImage: null,
    profileImage: null,
    accentColor: '#10b981',
  },
];

export function FeaturedStores() {
  const t = useTranslations('featuredStores');
  const tCommon = useTranslations('common');

  // For now, we'll show placeholder stores
  // In production, this will fetch from API
  const stores = placeholderStores;
  const isEmpty = false; // Set to true to show empty state

  return (
    <section id="featured-stores" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {isEmpty ? (
          /* Empty state */
          <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200">
            <svg
              className="w-16 h-16 mx-auto text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <p className="mt-4 text-gray-500 text-lg">{t('emptyState')}</p>
          </div>
        ) : (
          /* Stores grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-semibold text-lg shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5"
          >
            {tCommon('startForFree')}
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

interface Store {
  id: string;
  name: string;
  subdomain: string;
  coverImage: string | null;
  profileImage: string | null;
  accentColor: string;
}

function StoreCard({ store }: { store: Store }) {
  const t = useTranslations('featuredStores');

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-gray-300 hover:shadow-xl transition-all duration-300">
      {/* Cover image placeholder */}
      <div
        className="h-32 relative"
        style={{ backgroundColor: store.accentColor }}
      >
        {/* Profile image placeholder */}
        <div
          className="absolute -bottom-6 left-6 w-16 h-16 rounded-xl bg-white shadow-lg flex items-center justify-center text-2xl font-bold"
          style={{ color: store.accentColor }}
        >
          {store.name.charAt(0)}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-10">
        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
          {store.name}
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {store.subdomain}.sellit.ge
        </p>

        <a
          href={`https://${store.subdomain}.sellit.ge`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          {t('viewStore')}
          <svg
            className="w-4 h-4 group-hover:translate-x-1 transition-transform"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
        </a>
      </div>
    </div>
  );
}
