'use client';

import { useTranslations } from 'next-intl';
import { StepCard } from './StepCard';
import { BrandIcon, CategoryIcon, ProductIcon } from './StepIcons';
import { CtaButton } from '../../ui/CtaButton';

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
          <CtaButton />
        </div>
      </div>
    </section>
  );
}
