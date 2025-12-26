'use client';

import {
  useAccentColor,
  AccentColorName,
} from '../../theme/AccentColorProvider';

// Map of available accent colors for brand preview (subset of all accent colors)
const BRAND_COLOR_OPTIONS: AccentColorName[] = [
  'indigo',
  'pink',
  'emerald',
  'amber',
];

export function BrandPreview() {
  const { accentColor, setAccentColor, availableColors } = useAccentColor();

  // Filter to only show the 4 brand color options
  const brandColors = availableColors.filter((color) =>
    BRAND_COLOR_OPTIONS.includes(color.name),
  );

  // Find current selected index
  const selectedIndex = brandColors.findIndex(
    (c) => c.name === accentColor.name,
  );

  return (
    <div className="bg-gray-50 dark:bg-zinc-900 p-4">
      <div className="space-y-3">
        {/* Store name input mock */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg p-3 border border-gray-200 dark:border-zinc-700">
          <div className="text-xs text-gray-400 dark:text-gray-500 mb-1">
            Store Name
          </div>
          <div className="h-4 w-3/4 bg-gray-200 dark:bg-zinc-700 rounded" />
        </div>

        {/* Logo and cover row - changes based on selected color */}
        <div className="flex gap-3">
          <div
            className="w-12 h-12 rounded-lg transition-all duration-300"
            style={{
              background: `linear-gradient(to bottom right, var(--accent-400), #9333ea)`,
            }}
          />
          <div
            className="flex-1 h-12 rounded-lg transition-all duration-300"
            style={{
              background: `linear-gradient(to right, var(--accent-200), #e9d5ff)`,
            }}
          />
        </div>

        {/* Interactive color picker */}
        <div className="flex gap-3">
          {brandColors.map((color, index) => (
            <button
              key={color.hex}
              onClick={() => setAccentColor(color.name)}
              className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 ${
                index === selectedIndex
                  ? 'ring-2 ring-offset-2 dark:ring-offset-zinc-800 scale-110'
                  : 'hover:ring-1 hover:ring-offset-1 hover:ring-gray-300 dark:hover:ring-zinc-600'
              }`}
              style={{
                backgroundColor: color.hex,
                ['--tw-ring-color' as string]:
                  index === selectedIndex ? color.hex : undefined,
              }}
              aria-label={`Select ${color.name} color`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
