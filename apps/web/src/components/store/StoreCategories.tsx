'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

interface StoreCategoriesProps {
  categories: string[];
}

export function StoreCategories({ categories }: StoreCategoriesProps) {
  const t = useTranslations('store');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  return (
    <section id="categories" className="py-12 bg-white dark:bg-zinc-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {t('categories')}
        </h2>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-5 py-2.5 rounded-full font-medium transition-all ${
              activeCategory === null
                ? 'text-white shadow-lg'
                : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
            }`}
            style={
              activeCategory === null
                ? { backgroundColor: 'var(--store-accent-500)' }
                : undefined
            }
          >
            {t('all')}
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-5 py-2.5 rounded-full font-medium transition-all ${
                activeCategory === category
                  ? 'text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
              style={
                activeCategory === category
                  ? { backgroundColor: 'var(--store-accent-500)' }
                  : undefined
              }
            >
              {category}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
