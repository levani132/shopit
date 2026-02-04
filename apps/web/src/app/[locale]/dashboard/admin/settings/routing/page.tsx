'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../../../../i18n/routing';
import {
  useSettings,
  SectionCard,
  SectionTitle,
} from '../../../../../../components/dashboard/admin/SettingsLayout';

const ALGORITHMS = [
  {
    id: 'heuristic',
    name: 'Heuristic (Fast)',
    description:
      'Uses a greedy nearest-neighbor algorithm. Fast computation but may not find the optimal route. Good for real-time route generation.',
    pros: [
      'Very fast (< 100ms)',
      'Good for large order counts',
      'Predictable performance',
    ],
    cons: ['May miss better routes', 'Not mathematically optimal'],
  },
  {
    id: 'optimal',
    name: 'Optimal (Accurate)',
    description:
      'Uses Held-Karp dynamic programming and Branch-and-Bound algorithms to find the optimal or near-optimal route. Higher earnings but slower computation.',
    pros: [
      'Provably optimal for ≤10 orders',
      'Near-optimal for larger sets',
      'Maximizes courier earnings',
    ],
    cons: ['Slower computation', 'May take seconds for large order counts'],
  },
] as const;

export default function RoutingSettingsPage() {
  const t = useTranslations('admin');
  const { settings, updateSetting } = useSettings();

  if (!settings) return null;

  const currentAlgorithm = settings.routeAlgorithm || 'heuristic';

  return (
    <div className="space-y-6">
      <SectionCard>
        <SectionTitle className="mb-4">{t('routingAlgorithm')}</SectionTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('routingAlgorithmDescription')}
        </p>

        <div className="grid gap-4 md:grid-cols-2">
          {ALGORITHMS.map((algo) => (
            <button
              key={algo.id}
              onClick={() => updateSetting('routeAlgorithm', algo.id)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                currentAlgorithm === algo.id
                  ? 'border-[var(--accent-500)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20'
                  : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                    currentAlgorithm === algo.id
                      ? 'border-[var(--accent-500)] bg-[var(--accent-500)]'
                      : 'border-gray-300 dark:border-zinc-600'
                  }`}
                >
                  {currentAlgorithm === algo.id && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {algo.name}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {algo.description}
                  </p>

                  <div className="space-y-2">
                    <div>
                      <span className="text-xs font-medium text-green-600 dark:text-green-400">
                        Pros:
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {algo.pros.map((pro, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
                          >
                            <span className="text-green-500">✓</span> {pro}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-red-600 dark:text-red-400">
                        Cons:
                      </span>
                      <ul className="mt-1 space-y-0.5">
                        {algo.cons.map((con, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1"
                          >
                            <span className="text-red-500">✗</span> {con}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      {/* Link to comparison page */}
      <SectionCard>
        <SectionTitle className="mb-4">{t('algorithmComparison')}</SectionTitle>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('algorithmComparisonDescription')}
        </p>
        <Link
          href="/dashboard/admin/route-comparison"
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-500)] hover:bg-[var(--accent-600)] text-white font-medium rounded-lg transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          {t('viewComparison')}
        </Link>
      </SectionCard>
    </div>
  );
}
