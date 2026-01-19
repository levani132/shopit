'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import {
  MAIN_SITE_ACCENT_COLORS,
  MainSiteAccentColorName,
} from '@shopit/constants';

export type AccentColorName = MainSiteAccentColorName;

export interface AccentColor {
  name: AccentColorName;
  hex: string;
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

// Transform MAIN_SITE_ACCENT_COLORS to the expected format
const ACCENT_COLORS: Record<AccentColorName, AccentColor> = Object.fromEntries(
  Object.entries(MAIN_SITE_ACCENT_COLORS).map(([key, value]) => [
    key,
    {
      name: value.name,
      hex: value.hex,
      shades: {
        50: value[50],
        100: value[100],
        200: value[200],
        300: value[300],
        400: value[400],
        500: value[500],
        600: value[600],
        700: value[700],
        800: value[800],
        900: value[900],
      },
    },
  ]),
) as Record<AccentColorName, AccentColor>;

interface AccentColorContextType {
  accentColor: AccentColor;
  setAccentColor: (color: AccentColorName) => void;
  availableColors: AccentColor[];
}

const AccentColorContext = createContext<AccentColorContextType | undefined>(
  undefined,
);

export function AccentColorProvider({ children }: { children: ReactNode }) {
  const [accentColorName, setAccentColorName] =
    useState<AccentColorName>('indigo');
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Check if we're on dashboard pages (which manage their own accent colors)
  const isDashboard = pathname?.includes('/dashboard');

  useEffect(() => {
    setMounted(true);

    // Load saved accent color from localStorage
    const savedColor = localStorage.getItem(
      'accentColor',
    ) as AccentColorName | null;
    if (savedColor && ACCENT_COLORS[savedColor]) {
      setAccentColorName(savedColor);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Skip setting colors on dashboard pages - dashboard manages its own colors
    if (isDashboard) return;

    const color = ACCENT_COLORS[accentColorName];

    // Set CSS variables on document root
    Object.entries(color.shades).forEach(([shade, value]) => {
      document.documentElement.style.setProperty(`--accent-${shade}`, value);
    });

    // Save to localStorage
    localStorage.setItem('accentColor', accentColorName);
  }, [accentColorName, mounted, isDashboard]);

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
    throw new Error(
      'useAccentColor must be used within an AccentColorProvider',
    );
  }
  return context;
}
