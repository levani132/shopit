'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

export type AccentColorName = 'indigo' | 'pink' | 'emerald' | 'amber' | 'blue' | 'purple' | 'red' | 'teal';

export interface AccentColor {
  name: AccentColorName;
  hex: string;
  // CSS variable values for different shades
  shades: {
    50: string;
    100: string;
    200: string;
    300: string;
    400: string;
    500: string;
    600: string;
    700: string;
    800: string;
    900: string;
  };
}

const ACCENT_COLORS: Record<AccentColorName, AccentColor> = {
  indigo: {
    name: 'indigo',
    hex: '#6366f1',
    shades: {
      50: '#eef2ff',
      100: '#e0e7ff',
      200: '#c7d2fe',
      300: '#a5b4fc',
      400: '#818cf8',
      500: '#6366f1',
      600: '#4f46e5',
      700: '#4338ca',
      800: '#3730a3',
      900: '#312e81',
    },
  },
  pink: {
    name: 'pink',
    hex: '#ec4899',
    shades: {
      50: '#fdf2f8',
      100: '#fce7f3',
      200: '#fbcfe8',
      300: '#f9a8d4',
      400: '#f472b6',
      500: '#ec4899',
      600: '#db2777',
      700: '#be185d',
      800: '#9f1239',
      900: '#831843',
    },
  },
  emerald: {
    name: 'emerald',
    hex: '#10b981',
    shades: {
      50: '#ecfdf5',
      100: '#d1fae5',
      200: '#a7f3d0',
      300: '#6ee7b7',
      400: '#34d399',
      500: '#10b981',
      600: '#059669',
      700: '#047857',
      800: '#065f46',
      900: '#064e3b',
    },
  },
  amber: {
    name: 'amber',
    hex: '#f59e0b',
    shades: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
  },
  blue: {
    name: 'blue',
    hex: '#3b82f6',
    shades: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
  },
  purple: {
    name: 'purple',
    hex: '#a855f7',
    shades: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },
  },
  red: {
    name: 'red',
    hex: '#ef4444',
    shades: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
  },
  teal: {
    name: 'teal',
    hex: '#14b8a6',
    shades: {
      50: '#f0fdfa',
      100: '#ccfbf1',
      200: '#99f6e4',
      300: '#5eead4',
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
      700: '#0f766e',
      800: '#115e59',
      900: '#134e4a',
    },
  },
};

interface AccentColorContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColorName) => void;
  availableColors: AccentColor[];
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(
  undefined,
);

export function AccentColorProvider({ children }: { children: ReactNode }) {
  const [accentColorName, setAccentColorName] = useState<AccentColorName>('indigo');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load saved accent color from localStorage
    const savedColor = localStorage.getItem('accentColor') as AccentColorName | null;
    if (savedColor && ACCENT_COLORS[savedColor]) {
      setAccentColorName(savedColor);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const color = ACCENT_COLORS[accentColorName];
    
    // Set CSS variables on document root
    Object.entries(color.shades).forEach(([shade, value]) => {
      document.documentElement.style.setProperty(
        `--accent-${shade}`,
        value
      );
    });
    
    // Save to localStorage
    localStorage.setItem('accentColor', accentColorName);
  }, [accentColorName, mounted]);

  const setAccentColor = (color: AccentColorName) => {
    setAccentColorName(color);
  };

  return (
    <AccentColorContext.Provider
      value={{
        accentColor: ACCENT_COLORS[accentColorName],
        setAccentColor,
        availableColors: Object.values(ACCENT_COLORS),
      }}
    >
      {children}
    </AccentColorContext.Provider>
  );
}

export function useAccentColor() {
  const context = useContext(AccentColorContext);
  if (context === undefined) {
    throw new Error('useAccentColor must be used within an AccentColorProvider');
  }
  return context;
}

