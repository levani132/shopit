import type { TemplateDefinition } from './types';

const templates = new Map<string, TemplateDefinition>();
const remoteTemplateCache = new Map<string, Promise<TemplateDefinition>>();

export function registerTemplate(template: TemplateDefinition): void {
  templates.set(template.id, template);
}

export function getTemplate(templateId?: string | null): TemplateDefinition {
  const id = templateId || 'default';
  const template = templates.get(id);
  if (template) return template;

  const fallback = templates.get('default');
  if (fallback) return fallback;

  throw new Error(
    `Template "${id}" not found and no default template is registered. ` +
      'Make sure the default template is imported before resolving.',
  );
}

export function getAllTemplates(): TemplateDefinition[] {
  return Array.from(templates.values());
}

export function getTemplateIds(): string[] {
  return Array.from(templates.keys());
}

type PageSlot = keyof TemplateDefinition['pages'];
type OptionalPageSlot = keyof NonNullable<TemplateDefinition['optionalPages']>;
type AllPageSlots = PageSlot | OptionalPageSlot | 'comingSoon' | 'notFound';

/**
 * Resolve the component for a given page slot in a template.
 * Checks: template.pages → template.optionalPages → shared defaults.
 */
export function getPageComponent(
  templateId: string | undefined | null,
  slot: AllPageSlots,
): React.ComponentType<any> | null {
  const template = getTemplate(templateId);

  // Required pages
  if (slot in template.pages) {
    return (template.pages as Record<string, React.ComponentType<any>>)[slot] ?? null;
  }

  // Optional overrides from this template
  if (template.optionalPages && slot in template.optionalPages) {
    return (template.optionalPages as Record<string, React.ComponentType<any>>)[slot] ?? null;
  }

  return null;
}

/**
 * Resolve custom page component for a template.
 */
export function getCustomPageComponent(
  templateId: string | undefined | null,
  slug: string,
): React.ComponentType<any> | null {
  const template = getTemplate(templateId);
  return template.customPages?.[slug] ?? null;
}

/**
 * Get the merged template config for a store: template defaults + store overrides.
 */
export function getTemplateConfig(
  templateId: string | undefined | null,
  storeOverrides?: Record<string, unknown>,
): Record<string, unknown> {
  const template = getTemplate(templateId);
  return {
    ...template.defaultAttributeValues,
    ...storeOverrides,
  };
}

// ---------------------------------------------------------------------------
// Remote template loading (for marketplace / external developer templates)
// ---------------------------------------------------------------------------

/**
 * Load a template from a CDN bundle URL at runtime.
 * The bundle must export a default TemplateDefinition.
 * Results are cached so the same URL is only fetched once.
 */
export async function loadRemoteTemplate(
  templateId: string,
  bundleUrl: string,
): Promise<TemplateDefinition> {
  // Already registered locally (e.g. from a previous load)
  const existing = templates.get(templateId);
  if (existing) return existing;

  // Deduplicate in-flight loads
  const cached = remoteTemplateCache.get(bundleUrl);
  if (cached) return cached;

  const loadPromise = (async () => {
    const mod = await import(/* webpackIgnore: true */ bundleUrl);
    const template: TemplateDefinition = mod.default ?? mod;

    if (!template.id || !template.pages) {
      throw new Error(
        `Remote template bundle at "${bundleUrl}" does not export a valid TemplateDefinition.`,
      );
    }

    templates.set(template.id, template);
    return template;
  })();

  remoteTemplateCache.set(bundleUrl, loadPromise);

  // Clean cache on failure so it can be retried
  loadPromise.catch(() => {
    remoteTemplateCache.delete(bundleUrl);
  });

  return loadPromise;
}

/**
 * Check whether a template is already registered (built-in or loaded remotely).
 */
export function hasTemplate(templateId: string): boolean {
  return templates.has(templateId);
}
