'use client';

import type { ReactNode } from 'react';
import type { StoreData } from '../types/template.types.js';
import { StoreDataProvider, LocaleProvider, TemplateConfigProvider } from '../hooks/index.jsx';
import { sampleStore } from './sample-data.js';

interface MockStoreProviderProps {
  /** Override any store data fields. */
  store?: Partial<StoreData>;
  locale?: string;
  templateConfig?: Record<string, unknown>;
  children: ReactNode;
}

/**
 * Wraps your template with realistic mock store data for local development.
 * Provides StoreData, locale, and template config contexts.
 */
export function MockStoreProvider({
  store,
  locale = 'en',
  templateConfig = {},
  children,
}: MockStoreProviderProps) {
  const mergedStore: StoreData = { ...sampleStore, ...store };

  return (
    <LocaleProvider locale={locale}>
      <TemplateConfigProvider config={templateConfig}>
        <StoreDataProvider store={mergedStore}>
          {children}
        </StoreDataProvider>
      </TemplateConfigProvider>
    </LocaleProvider>
  );
}
