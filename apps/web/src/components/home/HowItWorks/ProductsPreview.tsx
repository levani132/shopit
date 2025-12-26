'use client';

import { useState } from 'react';

export function ProductsPreview() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <button
            key={i}
            onClick={() => setSelectedProduct(selectedProduct === i ? null : i)}
            className={`bg-white dark:bg-zinc-800 rounded-lg p-2 border text-left transition-all duration-200 ${
              selectedProduct === i
                ? 'border-[var(--accent-300)] dark:border-[var(--accent-600)] shadow-md dark:shadow-zinc-900/50 scale-[1.02]'
                : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-sm'
            }`}
          >
            <div
              className={`aspect-square rounded mb-2 transition-all duration-200 ${
                selectedProduct === i
                  ? 'bg-gradient-to-br from-[var(--accent-200)] to-[#e9d5ff] dark:from-[var(--accent-900)]/50 dark:to-[#581c87]/50'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800'
              }`}
            />
            <div className="h-2 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded mb-1" />
            <div
              className={`h-2 w-1/2 rounded transition-colors duration-200 ${
                selectedProduct === i
                  ? 'bg-[var(--accent-400)] dark:bg-[var(--accent-500)]'
                  : 'bg-[var(--accent-200)] dark:bg-[var(--accent-900)]/50'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
