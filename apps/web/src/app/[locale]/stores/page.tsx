'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { getLatinInitial } from '../../../lib/utils';
import { getStoreUrl, getBaseDomain } from '../../../utils/subdomain';
import { api } from '../../../lib/api';

interface PublicStore {
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

interface StoresResponse {
  stores: PublicStore[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function StoresPage() {
  const t = useTranslations('stores');
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStores = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '12',
      });
      if (debouncedSearch) {
        params.set('search', debouncedSearch);
      }
      const data = await api.get<StoresResponse>(`/stores/public?${params}`);
      setStores(data.stores);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    } finally {
      setIsLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </div>

          {/* Search */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-[var(--accent-500)] focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Results count */}
        {!isLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {t('showingStores', { count: total })}
          </p>
        )}

        {isLoading ? (
          /* Loading state */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 animate-pulse"
              >
                <div className="h-28 bg-gray-200 dark:bg-zinc-700" />
                <div className="p-5 pt-8">
                  <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : stores.length === 0 ? (
          /* Empty state */
          <div className="text-center py-16 px-4 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700">
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
              {debouncedSearch ? t('noStoresMatch') : t('noStores')}
            </p>
          </div>
        ) : (
          /* Stores grid */
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {stores.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-12 flex justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
            >
              {t('previous')}
            </button>
            <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
              {t('pageOf', { page, totalPages })}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-zinc-700 transition"
            >
              {t('next')}
            </button>
          </div>
        )}

        {/* Back to home */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:underline font-medium"
          >
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
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}

function StoreCard({ store }: { store: PublicStore }) {
  const t = useTranslations('stores');

  return (
    <a
      href={getStoreUrl(store.subdomain)}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white dark:bg-zinc-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-xl dark:hover:shadow-zinc-900/50 transition-all duration-300"
    >
      {/* Cover image */}
      <div
        className="h-28 relative bg-cover bg-center"
        style={{
          backgroundColor: store.accentColor,
          backgroundImage: store.coverImage
            ? `url(${store.coverImage})`
            : undefined,
        }}
      >
        {/* Logo / Initial */}
        <div
          className="absolute -bottom-5 left-5 w-14 h-14 flex items-center justify-center"
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
              <span className="text-xl font-bold">
                {getLatinInitial(store.name)}
              </span>
            </div>
          )}
        </div>
        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1.5">
          {store.isFeatured && (
            <div className="bg-amber-500 text-white rounded-full p-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          )}
          {store.isVerified && (
            <div className="bg-white/90 dark:bg-zinc-800/90 rounded-full p-1">
              <svg
                className="w-3.5 h-3.5 text-blue-500"
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
      </div>

      {/* Content */}
      <div className="p-5 pt-8">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white transition-colors group-hover:text-[var(--accent-600)] dark:group-hover:text-[var(--accent-400)] truncate">
          {store.name}
        </h3>
        <p
          className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate"
          suppressHydrationWarning
        >
          {store.subdomain}.{getBaseDomain().baseDomain}
        </p>

        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[var(--accent-600)] dark:text-[var(--accent-400)] group-hover:text-[var(--accent-700)] dark:group-hover:text-[var(--accent-300)] transition-colors">
          {t('viewStore')}
          <svg
            className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform"
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
