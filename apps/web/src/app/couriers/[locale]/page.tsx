'use client';

import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { Role, hasRole } from '@shopit/constants';
import { CourierHeader } from '../../../components/courier/CourierHeader';

export default function CourierLandingPage() {
  const t = useTranslations('courier');
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  const { isAuthenticated, user } = useAuth();

  const isCourier = hasRole(user?.role ?? 0, Role.COURIER);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <CourierHeader />

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/20 rounded-full border border-indigo-500/30 mb-8">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-indigo-300 text-sm font-medium">
              {t('nowHiring')}
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            {t('heroTitle')}
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              {t('heroTitleHighlight')}
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            {t('heroDescription')}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {isAuthenticated && isCourier ? (
              <Link
                href={`/${locale}/dashboard`}
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-indigo-500/25"
              >
                {t('goToDashboard')}
              </Link>
            ) : (
              <Link
                href={
                  isAuthenticated
                    ? `/${locale}/apply`
                    : `/${locale}/register?redirect=/couriers/${locale}/apply`
                }
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-indigo-500/25"
              >
                {t('becomeACourier')}
              </Link>
            )}
            <a
              href="#how-it-works"
              className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-lg transition-all border border-white/20"
            >
              {t('learnMore')}
            </a>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4 border-y border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                500+
              </div>
              <div className="text-gray-400">{t('statsStores')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                10k+
              </div>
              <div className="text-gray-400">{t('statsDeliveries')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                ₾50+
              </div>
              <div className="text-gray-400">{t('statsAvgEarnings')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                24/7
              </div>
              <div className="text-gray-400">{t('statsSupport')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            {t('howItWorksTitle')}
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            {t('howItWorksDescription')}
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-indigo-500/50 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                1
              </div>
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {t('step1Title')}
              </h3>
              <p className="text-gray-400">{t('step1Description')}</p>
            </div>

            {/* Step 2 */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-indigo-500/50 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                2
              </div>
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {t('step2Title')}
              </h3>
              <p className="text-gray-400">{t('step2Description')}</p>
            </div>

            {/* Step 3 */}
            <div className="relative p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/0 border border-white/10 hover:border-indigo-500/50 transition-colors">
              <div className="absolute -top-4 -left-4 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                3
              </div>
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-6">
                <svg
                  className="w-8 h-8 text-indigo-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {t('step3Title')}
              </h3>
              <p className="text-gray-400">{t('step3Description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-indigo-950/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-4">
            {t('benefitsTitle')}
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            {t('benefitsDescription')}
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: '⏰', title: 'flexibleHours', desc: 'flexibleHoursDesc' },
              {
                icon: '💰',
                title: 'competitivePay',
                desc: 'competitivePayDesc',
              },
              { icon: '📱', title: 'easyApp', desc: 'easyAppDesc' },
              {
                icon: '🚗',
                title: 'useYourVehicle',
                desc: 'useYourVehicleDesc',
              },
              { icon: '📊', title: 'trackEarnings', desc: 'trackEarningsDesc' },
              { icon: '🤝', title: 'weeklyPayouts', desc: 'weeklyPayoutsDesc' },
            ].map((benefit) => (
              <div
                key={benefit.title}
                className="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-indigo-500/30 transition-colors"
              >
                <span className="text-3xl mb-4 block">{benefit.icon}</span>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {t(benefit.title)}
                </h3>
                <p className="text-gray-400 text-sm">{t(benefit.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 rounded-3xl bg-gradient-to-br from-indigo-600/20 to-purple-600/20 border border-indigo-500/30">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              {t('ctaTitle')}
            </h2>
            <p className="text-gray-300 mb-8 max-w-xl mx-auto">
              {t('ctaDescription')}
            </p>
            <Link
              href={
                isAuthenticated
                  ? `/couriers/${locale}/apply`
                  : `/${locale}/register?redirect=/couriers/${locale}/apply`
              }
              className="inline-flex px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold rounded-xl text-lg transition-all shadow-lg shadow-indigo-500/25"
            >
              {t('startDelivering')}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-white/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                />
              </svg>
            </div>
            <span className="text-gray-400 text-sm">
              ShopIt Couriers © {new Date().getFullYear()}
            </span>
          </div>
          <div className="flex gap-6 text-gray-400 text-sm">
            <a href="#" className="hover:text-white transition-colors">
              {t('footerTerms')}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t('footerPrivacy')}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t('footerSupport')}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
