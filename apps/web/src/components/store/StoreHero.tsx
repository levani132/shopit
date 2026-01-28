'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { getLatinInitial } from '../../lib/utils';
import { useStoreEditOptional } from '../../contexts/StoreEditContext';
import { EditableText, EditableImage } from './EditableField';

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
    authorInitial?: string; // Pre-computed English initial for author avatar
  };
  locale: string;
}

export function StoreHero({ store, locale }: StoreHeroProps) {
  const t = useTranslations('store');
  const storeEdit = useStoreEditOptional();
  const isEditing = storeEdit?.isStoreOwner ?? false;
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  
  const authorName = store.authorName || t('storeOwner');
  const showAuthor = store.showAuthorName !== false;
  const hasCoverImage = store.coverImage && !store.useDefaultCover;

  const handleCoverClick = () => {
    coverInputRef.current?.click();
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storeEdit?.uploadStoreFile) return;

    setIsUploadingCover(true);
    try {
      await storeEdit.uploadStoreFile(file, 'cover');
    } catch (error) {
      console.error('Failed to upload cover:', error);
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Background - either cover image or gradient */}
      {hasCoverImage ? (
        <div className="absolute inset-0">
          <img
            src={store.coverImage}
            alt={`${store.name} cover`}
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-black/40" />
        </div>
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

      {/* Cover Edit Button - only for admin in edit mode */}
      {isEditing && (
        <>
          <button
            onClick={handleCoverClick}
            disabled={isUploadingCover}
            className="absolute top-4 right-4 z-10 p-3 bg-white/90 dark:bg-zinc-800/90 rounded-full shadow-lg hover:bg-white dark:hover:bg-zinc-700 transition-colors"
            title={t('editCover') || 'Edit Cover'}
          >
            {isUploadingCover ? (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="hidden"
          />
        </>
      )}

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
        <div className="text-center">
          {/* Store Avatar/Logo */}
          <div className="mb-6 flex justify-center">
            <EditableImage
              field="logo"
              value={store.logo}
              alt={store.name}
              className="w-24 h-24 rounded-full"
              imageClassName="w-24 h-24 rounded-full object-cover border-4 border-white/30 shadow-xl"
              placeholder={
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold text-4xl border-4 border-white/30 shadow-xl"
                  style={{ backgroundColor: 'var(--store-accent-700)' }}
                >
                  {store.initial || getLatinInitial(store.name)}
                </div>
              }
            />
          </div>

          {/* Store Name */}
          <div className="mb-4">
            <EditableText
              field="name"
              value={store.name}
              localized
              locale={locale}
              placeholder={t('storeName')}
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-white drop-shadow-lg"
              as="h1"
            />
          </div>

          {/* Description */}
          {(store.description || isEditing) && (
            <div className="max-w-2xl mx-auto mb-8">
              <EditableText
                field="description"
                value={store.description || ''}
                localized
                locale={locale}
                placeholder={t('addDescription') || 'Add store description...'}
                multiline
                className="text-lg md:text-xl text-white/90 drop-shadow"
                as="p"
              />
            </div>
          )}

          {/* Owner */}
          {(showAuthor || isEditing) && (
            <div className="flex items-center justify-center gap-2 text-white/80">
              <span>{t('by')}</span>
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: 'var(--store-accent-800)' }}
              >
                {store.authorInitial || getLatinInitial(authorName)}
              </div>
              <EditableText
                field="authorName"
                value={store.authorName || ''}
                localized
                locale={locale}
                placeholder={t('addAuthorName') || 'Add author name...'}
                className="font-medium text-white/80"
                as="span"
              />
            </div>
          )}

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href={`/${locale}/products`}
              className="px-8 py-4 bg-white text-gray-900 rounded-xl hover:bg-gray-100 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            >
              {t('browseProducts')}
            </Link>
            <Link
              href={`/${locale}/about`}
              className="px-8 py-4 bg-white/10 text-white border border-white/30 rounded-xl hover:bg-white/20 transition-all font-semibold text-lg backdrop-blur-sm"
            >
              {t('learnMore')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
