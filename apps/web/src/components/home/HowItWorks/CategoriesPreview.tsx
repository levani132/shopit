'use client';

import { useState } from 'react';
import { useBrandColor } from './BrandColorContext';

const INITIAL_CATEGORIES = ['Electronics', 'Clothing', 'Accessories'];

export function CategoriesPreview() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { selectedColor } = useBrandColor();

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="space-y-2">
        {INITIAL_CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            onClick={() => setSelectedIndex(i)}
            className={`w-full text-left bg-white dark:bg-zinc-800 rounded-lg p-3 border transition-all duration-200 ${
              i === selectedIndex
                ? `${selectedColor.border} ${selectedColor.borderDark} ${selectedColor.bgLight} ${selectedColor.bgLightDark} shadow-sm`
                : 'border-gray-200 dark:border-zinc-700 hover:border-gray-300 dark:hover:border-zinc-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded transition-colors duration-200 ${
                  i === selectedIndex ? `${selectedColor.bg} ${selectedColor.bgDark}` : 'bg-gray-300 dark:bg-zinc-600'
                }`}
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
            </div>
          </button>
        ))}
        <button className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-lg text-gray-400 dark:text-gray-500 text-sm hover:border-gray-400 dark:hover:border-zinc-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors">
          + Add Category
        </button>
      </div>
    </div>
  );
}
