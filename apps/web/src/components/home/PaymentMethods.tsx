'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { Link } from '../../i18n/routing';
import { TbcBankLogo, BankOfGeorgiaLogo, PayPalLogo } from '../icons';

export function PaymentMethods() {
  const t = useTranslations('paymentMethods');
  const tCommon = useTranslations('common');

  return (
    <section className="py-16 md:py-24 bg-gradient-to-br from-gray-50 to-white dark:from-zinc-900 dark:to-zinc-800 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text Content */}
          <div className="order-2 lg:order-2">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              {t('title')}
            </h2>
            <p className="text-lg md:text-xl text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              {t('subtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
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
                <span>Secure transactions</span>
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
                <span>Instant payouts</span>
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
                <span>No hidden fees</span>
              </div>
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-8 py-4 bg-[var(--accent-600)] dark:bg-[var(--accent-500)] text-white rounded-xl hover:bg-[var(--accent-700)] dark:hover:bg-[var(--accent-600)] transition-all font-semibold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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

          {/* Image with Floating Logos */}
          <div className="order-1 lg:order-1 relative">
            {/* Main Image Container */}
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src="/images/payment-hero.jpg"
                alt="Customer making a contactless payment"
                fill
                className="object-cover"
              />
            </div>

            {/* Floating Logo Cards */}
            {/* TBC Bank - Top Left */}
            <div className="absolute -top-4 -left-4 md:top-4 md:left-[-2rem] animate-float">
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 dark:border-zinc-700 hover:shadow-xl transition-shadow duration-300">
                <TbcBankLogo className="w-auto h-8 md:h-10" />
              </div>
            </div>

            {/* Bank of Georgia - Bottom Right */}
            <div
              className="absolute -bottom-4 -right-4 md:bottom-8 md:right-[-2rem] animate-float"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 dark:border-zinc-700 hover:shadow-xl transition-shadow duration-300">
                <BankOfGeorgiaLogo className="h-10 md:h-12 w-auto" />
              </div>
            </div>

            {/* PayPal - Bottom Left */}
            <div
              className="absolute -bottom-6 left-8 md:bottom-[-1rem] md:left-16 animate-float"
              style={{ animationDelay: '1s' }}
            >
              <div className="bg-white dark:bg-zinc-800 rounded-xl p-3 md:p-4 shadow-lg border border-gray-100 dark:border-zinc-700 hover:shadow-xl transition-shadow duration-300">
                <PayPalLogo className="h-10 md:h-12 w-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
