'use client';

import { useState } from 'react';

const INITIAL_CATEGORIES = ['Electronics', 'Clothing', 'Accessories'];

export function CategoriesPreview() {
  const [selectedIndex, setSelectedIndex] = useState(0);

  return (
    <div className="bg-gray-50 p-4">
      <div className="space-y-2">
        {INITIAL_CATEGORIES.map((cat, i) => (
          <button
            key={cat}
            onClick={() => setSelectedIndex(i)}
            className={`w-full text-left bg-white rounded-lg p-3 border transition-all duration-200 ${
              i === selectedIndex
                ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded transition-colors duration-200 ${
                  i === selectedIndex ? 'bg-indigo-500' : 'bg-gray-300'
                }`}
              />
              <span className="text-sm text-gray-700">{cat}</span>
            </div>
          </button>
        ))}
        <button className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 text-sm hover:border-gray-400 hover:text-gray-500 transition-colors">
          + Add Category
        </button>
      </div>
    </div>
  );
}
