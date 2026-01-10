'use client';

import { useTranslations } from 'next-intl';
import { getLatinInitial } from '../../lib/utils';

interface StoreHeroProps {
  store: {
    name: string;
    description?: string;
    logo?: string;
    coverImage?: string;
    useDefaultCover?: boolean;
    authorName?: string;
    showAuthorName?: boolean;
    accentColor?: string;
    initial?: string; // Pre-computed English initial for avatar display
  };
}

export function StoreHero({ store }: StoreHeroProps) {
  const t = useTranslations('store');
  const authorName = store.authorName || t('storeOwner');
  const showAuthor = store.showAuthorName !== false;
  const hasCoverImage = store.coverImage && !store.useDefaultCover;

  return (
    <section className="relative overflow-hidden">
      {/* Background - either cover image or gradient */}
      {hasCoverImage ? (
        <>
          <div className="absolute inset-0">
            <img
              src={store.coverImage}
              alt={`${store.name} cover`}
              className="w-full h-full object-cover"
            />
            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        </>
      ) : (
        <>
          {/* Default gradient background */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, var(--store-accent-500) 0%, var(--store-accent-700) 100%)`,
            }}
          />

          {/* Decorative elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div
              className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20"
              style={{ backgroundColor: 'var(--store-accent-300)' }}
            />
            <div
              className="absolute -bottom-20 -left-20 w-60 h-60 rounded-full opacity-20"
              style={{ backgroundColor: 'var(--store-accent-300)' }}
            />
          </div>
        </>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center">
          {/* Store Avatar */}
          <div className="mb-6">
            {store.logo ? (
              <img
                src={store.logo}
                alt={store.name}
                className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-white/30 shadow-xl"
              />
            ) : (
              <div
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-white/30 shadow-xl"
                style={{ backgroundColor: 'var(--store-accent-700)' }}
              >
                {store.initial || getLatinInitial(store.name)}
              </div>
            )}
          </div>

          {/* Store Name */}
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 drop-shadow-lg">
            {store.name}
          </h1>

          {/* Description */}
          {store.description && (
            <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto mb-8 drop-shadow">
              {store.description}
            </p>
          )}

          {/* Owner */}
          {showAuthor && authorName && (
            <div className="flex items-center justify-center gap-2 text-white/80">
              <span>{t('by')}</span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: 'var(--store-accent-800)' }}
              >
                {getLatinInitial(authorName)}
              </div>
              <span className="font-medium">{authorName}</span>
            </div>
          )}

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#products"
              className="px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {t('browseProducts')}
            </a>
            <a
              href="#about"
              className="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-xl hover:bg-white/20 transition-all font-semibold text-lg backdrop-blur-sm"
            >
              {t('learnMore')}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
