import {
  getTemplate,
  hasTemplate,
  loadRemoteTemplate,
} from '../store-templates/registry';
import type { TemplateDefinition } from '../store-templates/types';

/**
 * Resolve a template by ID.
 *
 * 1. If the template is already registered (built-in), return it immediately.
 * 2. If a `bundleUrl` is provided, load the remote template from CDN.
 * 3. Fall back to the default template.
 */
export async function resolveTemplate(
  templateId: string | undefined | null,
  bundleUrl?: string | null,
): Promise<TemplateDefinition> {
  const id = templateId || 'default';

  // Already registered (built-in or previously loaded)
  if (hasTemplate(id)) {
    return getTemplate(id);
  }

  // Remote template — load from CDN bundle
  if (bundleUrl) {
    try {
      return await loadRemoteTemplate(id, bundleUrl);
    } catch (error) {
      console.error(
        `Failed to load remote template "${id}" from ${bundleUrl}:`,
        error,
      );
      // Fall back to default
      return getTemplate('default');
    }
  }

  // Not found and no bundleUrl — fall back to default
  return getTemplate(id);
}
