'use client';

import { useState } from 'react';
import { useBrandColor } from './BrandColorContext';

export function ProductsPreview() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const { selectedColor } = useBrandColor();

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <button
            key={i}
            onClick={() => setSelectedProduct(selectedProduct === i ? null : i)}
            className={`bg-white dark:bg-zinc-800 rounded-lg p-2 border text-left transition-all duration-200 ${
              selectedProduct === i
                ? `${selectedColor.border} ${selectedColor.borderDark} shadow-md dark:shadow-zinc-900/50 scale-[1.02]`
                : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600 hover:shadow-sm'
            }`}
          >
            <div
              className={`aspect-square rounded mb-2 transition-all duration-200 bg-gradient-to-br ${
                selectedProduct === i
                  ? `${selectedColor.lightGradient} ${selectedColor.gradientDark}`
                  : 'from-gray-100 to-gray-200 dark:from-zinc-700 dark:to-zinc-800'
              }`}
            />
            <div className="h-2 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded mb-1" />
            <div
              className={`h-2 w-1/2 rounded transition-colors duration-200 ${
                selectedProduct === i
                  ? `${selectedColor.bg400} ${selectedColor.bg400Dark}`
                  : `${selectedColor.bg200} ${selectedColor.bg200Dark}`
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
