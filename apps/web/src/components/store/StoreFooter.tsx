'use client';

import { useTranslations } from 'next-intl';
import { getLatinInitial } from '../../lib/utils';
import { EditableText } from './EditableField';
import { useStoreEditOptional } from '../../contexts/StoreEditContext';

interface StoreFooterProps {
  store: {
    name: string;
    subdomain?: string;
    description?: string;
    logo?: string;
    authorName?: string;
    showAuthorName?: boolean;
    phone?: string;
    email?: string;
    address?: string;
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
      tiktok?: string;
    };
    initial?: string;
  };
  locale: string;
}

export function StoreFooter({ store, locale }: StoreFooterProps) {
  const t = useTranslations('store');
  const storeEdit = useStoreEditOptional();
  const isEditing = storeEdit?.isStoreOwner && storeEdit?.isEditMode;
  const currentYear = new Date().getFullYear();
  const hasSocialLinks = store.socialLinks && Object.values(store.socialLinks).some(v => v);
  // Show contact section if has info OR in edit mode
  const hasContactInfo = store.phone || store.email || store.address || isEditing;

  return (
    <footer className="bg-white dark:bg-zinc-900 border-t border-gray-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Store Info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: 'var(--store-accent-500)' }}
                >
                  {store.initial || getLatinInitial(store.name)}
                </div>
              )}
              <EditableText
                field="name"
                value={store.name}
                localized
                locale={locale}
                placeholder={t('storeName') || 'Store Name'}
                className="font-semibold text-gray-900 dark:text-white text-lg"
                as="span"
              />
            </div>
            <EditableText
              field="description"
              value={store.description || ''}
              localized
              locale={locale}
              placeholder={t('addDescription') || 'Add description...'}
              className="text-gray-600 dark:text-gray-400 text-sm"
              as="p"
              multiline
            />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('quickLinks')}</h3>
            <ul className="space-y-2">
              <li>
                <a
                  href={`/${locale}`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                >
                  {t('home')}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/products`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                >
                  {t('products')}
                </a>
              </li>
              <li>
                <a
                  href={`/${locale}/about`}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm transition-colors"
                >
                  {t('aboutUs')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          {hasContactInfo && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('contact')}</h3>
              <ul className="space-y-3">
                {/* Phone */}
                {(store.phone || isEditing) && (
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <EditableText
                      field="phone"
                      value={store.phone || ''}
                      placeholder={t('addPhone') || 'Add phone...'}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      as="span"
                    />
                  </li>
                )}
                {/* Email */}
                {(store.email || isEditing) && (
                  <li className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <EditableText
                      field="email"
                      value={store.email || ''}
                      placeholder={t('addEmail') || 'Add email...'}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                      as="span"
                    />
                  </li>
                )}
                {/* Address */}
                {(store.address || isEditing) && (
                  <li className="flex items-start gap-2 text-gray-600 dark:text-gray-400 text-sm">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <EditableText
                      field="address"
                      value={store.address || ''}
                      placeholder={t('addAddress') || 'Add address...'}
                      className="text-gray-600 dark:text-gray-400"
                      as="span"
                    />
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Social Links */}
          {(hasSocialLinks || isEditing) && (
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('followUs')}</h3>
              {/* For visitors: horizontal icons only */}
              {!isEditing && (
                <div className="flex items-center gap-3">
                  {store.socialLinks?.facebook && (
                    <a
                      href={store.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white hover:opacity-80 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </a>
                  )}
                  {store.socialLinks?.instagram && (
                    <a
                      href={store.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white hover:opacity-80 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </a>
                  )}
                  {store.socialLinks?.tiktok && (
                    <a
                      href={store.socialLinks.tiktok}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-black text-white hover:opacity-80 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                      </svg>
                    </a>
                  )}
                  {store.socialLinks?.twitter && (
                    <a
                      href={store.socialLinks.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-black text-white hover:opacity-80 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
              {/* For admin: editable URLs with icons */}
              {isEditing && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-blue-600 text-white flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                    </div>
                    <EditableText
                      field="socialLinks.facebook"
                      value={store.socialLinks?.facebook || ''}
                      placeholder="https://facebook.com/..."
                      className="text-gray-600 dark:text-gray-400 text-sm"
                      as="span"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 text-white flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                      </svg>
                    </div>
                    <EditableText
                      field="socialLinks.instagram"
                      value={store.socialLinks?.instagram || ''}
                      placeholder="https://instagram.com/..."
                      className="text-gray-600 dark:text-gray-400 text-sm"
                      as="span"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black text-white flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z" />
                      </svg>
                    </div>
                    <EditableText
                      field="socialLinks.tiktok"
                      value={store.socialLinks?.tiktok || ''}
                      placeholder="https://tiktok.com/..."
                      className="text-gray-600 dark:text-gray-400 text-sm"
                      as="span"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-black text-white flex-shrink-0">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </div>
                    <EditableText
                      field="socialLinks.twitter"
                      value={store.socialLinks?.twitter || ''}
                      placeholder="https://x.com/..."
                      className="text-gray-600 dark:text-gray-400 text-sm"
                      as="span"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-zinc-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              © {currentYear} {store.name}. {t('allRightsReserved')}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">
              {t('poweredBy')}{' '}
              <a
                href="https://shopit.ge"
                className="hover:text-gray-600 transition-colors"
                style={{ color: 'var(--store-accent-500)' }}
              >
                ShopIt
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
