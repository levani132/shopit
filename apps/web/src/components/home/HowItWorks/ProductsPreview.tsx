'use client';

import { useState } from 'react';

export function ProductsPreview() {
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  return (
    <div className="bg-gray-50 p-4">
      <div className="grid grid-cols-2 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <button
            key={i}
            onClick={() => setSelectedProduct(selectedProduct === i ? null : i)}
            className={`bg-white rounded-lg p-2 border text-left transition-all duration-200 ${
              selectedProduct === i
                ? 'border-indigo-300 shadow-md scale-[1.02]'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            <div
              className={`aspect-square rounded mb-2 transition-all duration-200 ${
                selectedProduct === i
                  ? 'bg-gradient-to-br from-indigo-100 to-purple-100'
                  : 'bg-gradient-to-br from-gray-100 to-gray-200'
              }`}
            />
            <div className="h-2 w-3/4 bg-gray-200 rounded mb-1" />
            <div
              className={`h-2 w-1/2 rounded transition-colors duration-200 ${
                selectedProduct === i ? 'bg-indigo-400' : 'bg-indigo-200'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
