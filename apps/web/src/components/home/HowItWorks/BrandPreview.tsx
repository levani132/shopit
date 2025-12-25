'use client';

import { useState } from 'react';

const BRAND_COLORS = [
  {
    hex: '#6366f1',
    name: 'indigo',
    gradient: 'from-indigo-400 to-purple-400',
    lightGradient: 'from-indigo-200 to-purple-200',
  },
  {
    hex: '#ec4899',
    name: 'pink',
    gradient: 'from-pink-400 to-rose-400',
    lightGradient: 'from-pink-200 to-rose-200',
  },
  {
    hex: '#10b981',
    name: 'emerald',
    gradient: 'from-emerald-400 to-teal-400',
    lightGradient: 'from-emerald-200 to-teal-200',
  },
  {
    hex: '#f59e0b',
    name: 'amber',
    gradient: 'from-amber-400 to-orange-400',
    lightGradient: 'from-amber-200 to-orange-200',
  },
];

export function BrandPreview() {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);
  const selectedColor = BRAND_COLORS[selectedColorIndex];

  return (
    <div className="bg-gray-50 p-4">
      <div className="space-y-3">
        {/* Store name input mock */}
        <div className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-400 mb-1">Store Name</div>
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
        </div>

        {/* Logo and cover row - changes based on selected color */}
        <div className="flex gap-3">
          <div
            className={`w-12 h-12 bg-gradient-to-br ${selectedColor.gradient} rounded-lg transition-all duration-300`}
          />
          <div
            className={`flex-1 h-12 bg-gradient-to-r ${selectedColor.lightGradient} rounded-lg transition-all duration-300`}
          />
        </div>

        {/* Interactive color picker */}
        <div className="flex gap-3">
          {BRAND_COLORS.map((color, index) => (
            <button
              key={color.hex}
              onClick={() => setSelectedColorIndex(index)}
              className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 ${
                index === selectedColorIndex
                  ? 'ring-2 ring-offset-2 scale-110'
                  : 'hover:ring-1 hover:ring-offset-1 hover:ring-gray-300'
              }`}
              style={{
                backgroundColor: color.hex,
                ['--tw-ring-color' as string]:
                  index === selectedColorIndex ? color.hex : undefined,
              }}
              aria-label={`Select ${color.name} color`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
