'use client';

import { useState, useRef, useEffect } from 'react';
import { useAccentColor } from './AccentColorProvider';

export function AccentColorPicker() {
  const { accentColor, setAccentColor, availableColors } = useAccentColor();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
        aria-label="Change accent color"
        title="Change accent color"
      >
        <div
          className="w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600"
          style={{ backgroundColor: accentColor.hex }}
        />
      </button>
      
      {/* Color picker dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 bg-white dark:bg-zinc-800 rounded-lg shadow-lg border border-gray-200 dark:border-zinc-700 p-2 z-50">
          <div className="grid grid-cols-4 gap-2">
            {availableColors.map((color) => (
              <button
                key={color.name}
                onClick={() => {
                  setAccentColor(color.name);
                  setIsOpen(false);
                }}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 ${
                  accentColor.name === color.name
                    ? 'border-gray-900 dark:border-white ring-2 ring-offset-2 ring-[var(--accent-500)]'
                    : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: color.hex }}
                aria-label={`Select ${color.name} accent color`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

