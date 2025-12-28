import { useTranslations } from 'next-intl';
import { Link } from '../../i18n/routing';

export function Analytics() {
  const t = useTranslations('analytics');
  const tCommon = useTranslations('common');

  const features = [
    {
      key: 'sales',
      icon: SalesIcon,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      key: 'visitors',
      icon: VisitorsIcon,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      key: 'revenue',
      icon: RevenueIcon,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ];

  return (
    <section className="py-20 bg-white dark:bg-zinc-900 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side - Content */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              {t('title')}
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">{t('subtitle')}</p>

            {/* Features list */}
            <div className="mt-8 space-y-4">
              {features.map((feature) => (
                <div
                  key={feature.key}
                  className="flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <div
                    className={`w-12 h-12 ${feature.bgColor} rounded-xl flex items-center justify-center`}
                  >
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {t(`features.${feature.key}`)}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10">
              <Link
                href="/register"
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

          {/* Right side - Analytics dashboard mockup */}
          <div className="relative">
            <div className="bg-gray-900 rounded-2xl p-6 shadow-2xl">
              {/* Dashboard header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-gray-400 text-sm">Dashboard</div>
              </div>

              {/* Stats cards */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Revenue</div>
                  <div className="text-white text-lg font-bold">₾12,450</div>
                  <div className="text-green-400 text-xs mt-1">+12.5%</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Orders</div>
                  <div className="text-white text-lg font-bold">234</div>
                  <div className="text-green-400 text-xs mt-1">+8.2%</div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-gray-400 text-xs mb-1">Visitors</div>
                  <div className="text-white text-lg font-bold">3,842</div>
                  <div className="text-green-400 text-xs mt-1">+24.1%</div>
                </div>
              </div>

              {/* Chart mockup */}
              <div className="bg-gray-800 rounded-lg p-4">
                <div className="flex items-end justify-between h-32 gap-2">
                  {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map(
                    (height, i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                        style={{ 
                          background: 'linear-gradient(to top, var(--accent-600), #9333ea)',
                          height: `${height}%`
                        }}
                      />
                    ),
                  )}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Jan</span>
                  <span>Feb</span>
                  <span>Mar</span>
                  <span>Apr</span>
                  <span>May</span>
                  <span>Jun</span>
                </div>
              </div>
            </div>

            {/* Floating decoration */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full opacity-50 dark:opacity-20 blur-xl" style={{ backgroundColor: 'var(--accent-100)' }} />
            <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-purple-100 dark:bg-purple-900 rounded-full opacity-50 dark:opacity-20 blur-xl" />
          </div>
        </div>
      </div>
    </section>
  );
}

function SalesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function VisitorsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function RevenueIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}
