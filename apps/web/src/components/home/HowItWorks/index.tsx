'use client';

import { useTranslations } from 'next-intl';
import { Link } from '../../../i18n/routing';
import { StepCard } from './StepCard';
import { BrandIcon, CategoryIcon, ProductIcon } from './StepIcons';

const STEPS = [
  {
    number: 1,
    key: 'step1',
    icon: BrandIcon,
    color: 'from-[var(--accent-500)] to-purple-500',
    bgColor: 'bg-[var(--accent-50)]',
  },
  {
    number: 2,
    key: 'step2',
    icon: CategoryIcon,
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50',
  },
  {
    number: 3,
    key: 'step3',
    icon: ProductIcon,
    color: 'from-pink-500 to-orange-500',
    bgColor: 'bg-pink-50',
  },
];

export function HowItWorks() {
  const t = useTranslations('howItWorks');
  const tCommon = useTranslations('common');

  return (
    <section id="how-it-works" className="py-20 bg-gray-50 dark:bg-zinc-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step, index) => (
            <StepCard
              key={step.key}
              number={step.number}
              stepKey={step.key}
              title={t(`${step.key}.title`)}
              description={t(`${step.key}.description`)}
              icon={step.icon}
              color={step.color}
              bgColor={step.bgColor}
              isLast={index === STEPS.length - 1}
            />
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
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
    </section>
  );
}
