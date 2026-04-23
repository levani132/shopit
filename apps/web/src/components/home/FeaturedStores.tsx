'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CtaButton } from '../ui/CtaButton';
import { getLatinInitial } from '../../lib/utils';
import { getStoreUrl, getBaseDomain } from '../../utils/subdomain';
import { api } from '../../lib/api';

interface FeaturedStore {
  id: string;
  name: string;
  subdomain: string;
  logo: string | null;
  coverImage: string | null;
  brandColor: string;
  accentColor: string;
  useInitialAsLogo: boolean;
  isVerified: boolean;
  isFeatured: boolean;
}

export function FeaturedStores() {
  const t = useTranslations('featuredStores');
  const [stores, setStores] = useState<FeaturedStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchFeaturedStores() {
      try {
        const data = await api.get<{ stores: FeaturedStore[] }>(
          '/stores/featured?limit=6',
        );
        setStores(data.stores);
      } catch (error) {
        console.error('Failed to fetch featured stores:', error);
        // Keep empty array on error
      } finally {
        setIsLoading(false);
      }
    }

    fetchFeaturedStores();
  }, []);

  const isEmpty = !isLoading && stores.length === 0;

  return (
    <section id="featured-stores" className="py-20 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {isLoading ? (
          /* Loading state */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 animate-pulse"
              >
                <div className="h-32 bg-gray-200 dark:bg-zinc-700" />
                <div className="p-6 pt-10">
                  <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          /* Empty state */
          <div className="text-center py-16 px-4 rounded-2xl bg-gray-50 dark:bg-zinc-800 border-2 border-dashed border-gray-200 dark:border-zinc-700">
            <svg
              className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-500"
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
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-lg">
              {t('emptyState')}
            </p>
          </div>
        ) : (
          /* Stores grid */
          <>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {stores.map((store) => (
                <StoreCard key={store.id} store={store} />
              ))}
            </div>
            {/* Browse All Stores button */}
            <div className="text-center mt-8">
              <Link
                href="/stores"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              >
                {t('browseAllStores')}
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            </div>
          </>
        )}

        {/* CTA */}
        <div className="text-center mt-12">
          <CtaButton />
        </div>
      </div>
    </section>
  );
}

function StoreCard({ store }: { store: FeaturedStore }) {
  const t = useTranslations('featuredStores');

  return (
    <a
      href={getStoreUrl(store.subdomain)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-xl dark:hover:shadow-zinc-900/50 transition-all duration-300"
    >
      {/* Cover image */}
      <div
        className="h-32 relative bg-cover bg-center"
        style={{
          backgroundColor: store.accentColor,
          backgroundImage: store.coverImage
            ? `url(${store.coverImage})`
            : undefined,
        }}
      >
        {/* Logo / Initial */}
        <div
          className="absolute -bottom-6 left-6 w-16 h-16 flex items-center justify-center"
          style={{ color: store.accentColor }}
        >
          {store.logo && !store.useInitialAsLogo ? (
            <img
              src={store.logo}
              alt={store.name}
              className="w-full h-full object-contain"
              style={{
                filter: `
                  drop-shadow(0 0 0 rgba(0,0,0,0.08))
                  drop-shadow(0 0 1px rgba(0,0,0,0.12))
                  drop-shadow(0 0 3px rgba(0,0,0,0.08))
                  drop-shadow(0 2px 4px rgba(0,0,0,0.15))
                  drop-shadow(0 4px 8px rgba(0,0,0,0.12))
                `,
              }}
            />
          ) : (
            <div className="w-full h-full rounded-xl bg-white dark:bg-zinc-800 shadow-lg flex items-center justify-center">
              <span className="text-2xl font-bold">
                {getLatinInitial(store.name)}
              </span>
            </div>
          )}
        </div>
        {/* Verified badge */}
        {store.isVerified && (
          <div className="absolute top-3 right-3 bg-white/90 dark:bg-zinc-800/90 rounded-full p-1.5">
            <svg
              className="w-4 h-4 text-blue-500"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 pt-10">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[var(--accent-600)] dark:group-hover:text-[var(--accent-400)]">
          {store.name}
        </h3>
        <p
          className="text-sm text-gray-500 dark:text-gray-400 mt-1"
          suppressHydrationWarning
        >
          {store.subdomain}.{getBaseDomain().baseDomain}
        </p>

        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-600)] dark:text-[var(--accent-400)] group-hover:text-[var(--accent-700)] dark:group-hover:text-[var(--accent-300)] transition-colors">
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
        </span>
      </div>
    </a>
  );
}
