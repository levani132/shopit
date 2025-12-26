'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export interface BrandColor {
  hex: string;
  name: string;
  gradient: string;
  lightGradient: string;
  // Tailwind color classes for different use cases
  border: string;
  borderDark: string;
  bg: string;
  bgDark: string;
  bgLight: string;
  bgLightDark: string;
  text: string;
  textDark: string;
  // Additional variations for products preview
  bg400: string;
  bg400Dark: string;
  bg200: string;
  bg200Dark: string;
  gradientDark: string;
}

const BRAND_COLORS: BrandColor[] = [
  {
    hex: '#6366f1',
    name: 'indigo',
    gradient: 'from-indigo-400 to-purple-400',
    lightGradient: 'from-indigo-200 to-purple-200',
    border: 'border-indigo-300',
    borderDark: 'dark:border-indigo-600',
    bg: 'bg-indigo-500',
    bgDark: 'dark:bg-indigo-500',
    bgLight: 'bg-indigo-50',
    bgLightDark: 'dark:bg-indigo-900/30',
    text: 'text-indigo-600',
    textDark: 'dark:text-indigo-400',
    bg400: 'bg-indigo-400',
    bg400Dark: 'dark:bg-indigo-500',
    bg200: 'bg-indigo-200',
    bg200Dark: 'dark:bg-indigo-900/50',
    gradientDark: 'dark:from-indigo-900/50 dark:to-purple-900/50',
  },
  {
    hex: '#ec4899',
    name: 'pink',
    gradient: 'from-pink-400 to-rose-400',
    lightGradient: 'from-pink-200 to-rose-200',
    border: 'border-pink-300',
    borderDark: 'dark:border-pink-600',
    bg: 'bg-pink-500',
    bgDark: 'dark:bg-pink-500',
    bgLight: 'bg-pink-50',
    bgLightDark: 'dark:bg-pink-900/30',
    text: 'text-pink-600',
    textDark: 'dark:text-pink-400',
    bg400: 'bg-pink-400',
    bg400Dark: 'dark:bg-pink-500',
    bg200: 'bg-pink-200',
    bg200Dark: 'dark:bg-pink-900/50',
    gradientDark: 'dark:from-pink-900/50 dark:to-rose-900/50',
  },
  {
    hex: '#10b981',
    name: 'emerald',
    gradient: 'from-emerald-400 to-teal-400',
    lightGradient: 'from-emerald-200 to-teal-200',
    border: 'border-emerald-300',
    borderDark: 'dark:border-emerald-600',
    bg: 'bg-emerald-500',
    bgDark: 'dark:bg-emerald-500',
    bgLight: 'bg-emerald-50',
    bgLightDark: 'dark:bg-emerald-900/30',
    text: 'text-emerald-600',
    textDark: 'dark:text-emerald-400',
    bg400: 'bg-emerald-400',
    bg400Dark: 'dark:bg-emerald-500',
    bg200: 'bg-emerald-200',
    bg200Dark: 'dark:bg-emerald-900/50',
    gradientDark: 'dark:from-emerald-900/50 dark:to-teal-900/50',
  },
  {
    hex: '#f59e0b',
    name: 'amber',
    gradient: 'from-amber-400 to-orange-400',
    lightGradient: 'from-amber-200 to-orange-200',
    border: 'border-amber-300',
    borderDark: 'dark:border-amber-600',
    bg: 'bg-amber-500',
    bgDark: 'dark:bg-amber-500',
    bgLight: 'bg-amber-50',
    bgLightDark: 'dark:bg-amber-900/30',
    text: 'text-amber-600',
    textDark: 'dark:text-amber-400',
    bg400: 'bg-amber-400',
    bg400Dark: 'dark:bg-amber-500',
    bg200: 'bg-amber-200',
    bg200Dark: 'dark:bg-amber-900/50',
    gradientDark: 'dark:from-amber-900/50 dark:to-orange-900/50',
  },
];

interface BrandColorContextType {
  selectedColor: BrandColor;
  setSelectedColorIndex: (index: number) => void;
  colors: BrandColor[];
}

const BrandColorContext = createContext<BrandColorContextType | undefined>(
  undefined,
);

export function BrandColorProvider({ children }: { children: ReactNode }) {
  const [selectedColorIndex, setSelectedColorIndex] = useState(0);

  return (
    <BrandColorContext.Provider
      value={{
        selectedColor: BRAND_COLORS[selectedColorIndex],
        setSelectedColorIndex,
        colors: BRAND_COLORS,
      }}
    >
      {children}
    </BrandColorContext.Provider>
  );
}

export function useBrandColor() {
  const context = useContext(BrandColorContext);
  if (context === undefined) {
    throw new Error('useBrandColor must be used within a BrandColorProvider');
  }
  return context;
}

