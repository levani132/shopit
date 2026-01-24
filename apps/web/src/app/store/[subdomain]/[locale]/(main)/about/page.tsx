'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { api } from '../../../../../../lib/api';

interface StoreData {
  _id: string;
  subdomain: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  description?: string;
  descriptionLocalized?: { ka?: string; en?: string };
  aboutUs?: string;
  aboutUsLocalized?: { ka?: string; en?: string };
  authorName?: string;
  authorNameLocalized?: { ka?: string; en?: string };
  logo?: string;
  phone?: string;
  email?: string;
  address?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
}

// Helper to get localized text
function getLocalizedText(
  localized: { ka?: string; en?: string } | undefined,
  fallback: string | undefined,
  locale: string,
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback || '';
  }
  return fallback || '';
}

export default function AboutPage() {
  const t = useTranslations('store');
  const params = useParams();
  const subdomain = params?.subdomain as string;
  const locale = (params?.locale as string) || 'ka';

  const [store, setStore] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        const data = await api.get(`/stores/subdomain/${subdomain}`);
        setStore(data);
      } catch (error) {
        console.error('Error fetching store:', error);
      } finally {
        setLoading(false);
      }
    };

    if (subdomain) {
      fetchStore();
    }
  }, [subdomain]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse space-y-4 w-full max-w-2xl px-4">
          <div className="h-8 bg-gray-200 dark:bg-zinc-700 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-full" />
          <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {t('storeNotFound')}
          </h1>
          <Link
            href={`/${locale}`}
            className="text-[var(--store-accent-600)] hover:underline"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    );
  }

  const name = getLocalizedText(store.nameLocalized, store.name, locale);
  const description = getLocalizedText(
    store.descriptionLocalized,
    store.description,
    locale,
  );
  const aboutUs = getLocalizedText(
    store.aboutUsLocalized,
    store.aboutUs,
    locale,
  );
  const authorName = getLocalizedText(
    store.authorNameLocalized,
    store.authorName,
    locale,
  );
  const hasSocialLinks =
    store.socialLinks && Object.values(store.socialLinks).some((v) => v);
  const hasContactInfo = store.phone || store.email || store.address;
  // Use aboutUs if available, fall back to description for backward compatibility
  const aboutContent = aboutUs || description;

  return (
    <div className="bg-white dark:bg-zinc-900 min-h-[60vh]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          {store.logo && (
            <img
              src={store.logo}
              alt={name}
              className="w-24 h-24 mx-auto rounded-full object-cover mb-6 border-4 border-gray-100 dark:border-zinc-700"
            />
          )}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {t('about')} {name}
          </h1>
          {authorName && (
            <p className="text-gray-600 dark:text-gray-400">
              {t('by')} <span className="font-medium">{authorName}</span>
            </p>
          )}
        </div>

        {/* About Us Content */}
        {aboutContent && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('ourStory')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
              {aboutContent}
            </p>
          </div>
        )}

        {/* Contact Info */}
        {hasContactInfo && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('contactInfo')}
            </h2>
            <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-6 space-y-4">
              {store.phone && (
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  <a
                    href={`tel:${store.phone}`}
                    className="text-gray-700 dark:text-gray-300 hover:text-[var(--store-accent-600)]"
                  >
                    {store.phone}
                  </a>
                </div>
              )}
              {store.email && (
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <a
                    href={`mailto:${store.email}`}
                    className="text-gray-700 dark:text-gray-300 hover:text-[var(--store-accent-600)]"
                  >
                    {store.email}
                  </a>
                </div>
              )}
              {store.address && (
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-gray-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-gray-700 dark:text-gray-300">
                    {store.address}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              {t('followUs')}
            </h2>
            <div className="flex gap-4">
              {store.socialLinks?.facebook && (
                <a
                  href={store.socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[var(--store-accent-100)] hover:text-[var(--store-accent-600)] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.77 7.46H14.5v-1.9c0-.9.6-1.1 1-1.1h3V.5h-4.33C10.24.5 9.5 3.44 9.5 5.32v2.15h-3v4h3v12h5v-12h3.85l.42-4z" />
                  </svg>
                </a>
              )}
              {store.socialLinks?.instagram && (
                <a
                  href={store.socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[var(--store-accent-100)] hover:text-[var(--store-accent-600)] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              )}
              {store.socialLinks?.twitter && (
                <a
                  href={store.socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[var(--store-accent-100)] hover:text-[var(--store-accent-600)] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              )}
              {store.socialLinks?.tiktok && (
                <a
                  href={store.socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-600 dark:text-gray-400 hover:bg-[var(--store-accent-100)] hover:text-[var(--store-accent-600)] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="text-center pt-8 border-t border-gray-200 dark:border-zinc-700">
          <Link
            href={`/${locale}/products`}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: 'var(--store-accent-600)' }}
          >
            {t('browseProducts')}
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
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
