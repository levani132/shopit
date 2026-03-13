'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { TemplateDefinition } from './types';
import { getTemplate } from './registry';
import './templates/default';

interface TemplateContextValue {
  templateId: string;
  templateConfig: Record<string, unknown>;
  template: TemplateDefinition;
}

const TemplateContext = createContext<TemplateContextValue | null>(null);

interface TemplateProviderProps {
  templateId: string;
  templateConfig?: Record<string, unknown>;
  children: ReactNode;
}

export function TemplateProvider({
  templateId,
  templateConfig = {},
  children,
}: TemplateProviderProps) {
  const template = getTemplate(templateId);
  const mergedConfig = {
    ...template.defaultAttributeValues,
    ...templateConfig,
  };

  return (
    <TemplateContext.Provider
      value={{ templateId, templateConfig: mergedConfig, template }}
    >
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplate(): TemplateDefinition {
  const ctx = useContext(TemplateContext);
  if (!ctx) {
    return getTemplate('default');
  }
  return ctx.template;
}

export function useTemplateId(): string {
  const ctx = useContext(TemplateContext);
  return ctx?.templateId ?? 'default';
}

export function useTemplateConfig(): Record<string, unknown> {
  const ctx = useContext(TemplateContext);
  return ctx?.templateConfig ?? {};
}
