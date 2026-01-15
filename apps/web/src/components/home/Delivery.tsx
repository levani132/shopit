'use client';

import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import Image from 'next/image';
import { CtaButton } from '../ui/CtaButton';

/**
 * Generate the couriers subdomain URL based on current hostname
 * e.g., shopit.ge -> couriers.shopit.ge
 * e.g., localhost:3000 -> couriers.localhost:3000
 */
function getCouriersUrl(): string {
  if (typeof window === 'undefined') {
    // SSR fallback
    return 'https://couriers.shopit.ge';
  }
  
  const { protocol, host } = window.location;
  const [hostname, port] = host.split(':');
  
  // For localhost, add subdomain before it
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    const baseHost = hostname.replace(/^[^.]+\./, ''); // Remove any existing subdomain
    const newHost = port ? `couriers.${baseHost}:${port}` : `couriers.${baseHost}`;
    return `${protocol}//${newHost}`;
  }
  
  // For production domains like shopit.ge
  const parts = hostname.split('.');
  if (parts.length >= 2) {
    // Get the base domain (e.g., shopit.ge from www.shopit.ge or just shopit.ge)
    const baseDomain = parts.slice(-2).join('.');
    const newHost = port ? `couriers.${baseDomain}:${port}` : `couriers.${baseDomain}`;
    return `${protocol}//${newHost}`;
  }
  
  // Fallback
  return 'https://couriers.shopit.ge';
}

export function Delivery() {
  const t = useTranslations('delivery');
  
  const couriersUrl = useMemo(() => getCouriersUrl(), []);

  return (
    <section className="py-16 md:py-24 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image with Floating Elements */}
          <div className="order-1 lg:order-2 relative">
            {/* Main Image Container */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-orange-400 to-red-500">
              <Image
                src="/images/delivery-hero.jpg"
                alt="Courier delivering a package"
                fill
                className="object-cover"
              />
              {/* Fallback gradient overlay for when image doesn't load */}
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-red-500/20" />

              {/* Decorative courier icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-full p-6">
                  <svg
                    className="w-20 h-20 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                    />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floating Package Icon - Top Right */}
            <div className="absolute -top-4 -right-4 md:top-4 md:right-[-2rem] animate-float">
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 dark:border-zinc-700">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-orange-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
            </div>

            {/* Floating Truck Icon - Bottom Left */}
            <div
              className="absolute -bottom-4 left-8 md:bottom-[-1rem] md:left-16 animate-float"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 dark:border-zinc-700">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                  />
                </svg>
              </div>
            </div>

            {/* Floating Location Pin - Bottom Right */}
            <div
              className="absolute -bottom-6 -right-4 md:bottom-8 md:right-[-2rem] animate-float"
              style={{ animationDelay: '1s' }}
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 dark:border-zinc-700">
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-green-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('title')}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {t('subtitle')}
            </p>
            <div className="flex flex-wrap gap-4 mb-10">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t('fastDelivery')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t('trackingIncluded')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg
                  className="w-5 h-5 text-green-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{t('allGeorgia')}</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <CtaButton />
              <a
                href={couriersUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                {t('becomeACourier')}
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
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
