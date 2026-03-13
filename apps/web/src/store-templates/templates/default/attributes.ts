import type { TemplateAttributeDefinition } from '../../types';

export const defaultAttributes: TemplateAttributeDefinition[] = [
  {
    key: 'showCoverImage',
    label: 'Show Cover Image',
    description: 'Display a cover image or gradient on the homepage hero',
    type: 'boolean',
    default: true,
  },
  {
    key: 'showAuthorName',
    label: 'Show Author Name',
    description: 'Display the store owner name on the homepage',
    type: 'boolean',
    default: true,
  },
  {
    key: 'heroStyle',
    label: 'Hero Style',
    description: 'Visual style for the homepage hero section',
    type: 'select',
    options: ['full', 'compact', 'minimal'],
    default: 'full',
  },
  {
    key: 'productGridColumns',
    label: 'Products Per Row',
    description: 'Number of product columns on the homepage grid',
    type: 'number',
    min: 2,
    max: 5,
    default: 4,
  },
  {
    key: 'homepageProductCount',
    label: 'Homepage Products',
    description: 'Number of products shown on the homepage',
    type: 'number',
    min: 4,
    max: 16,
    default: 8,
  },
  {
    key: 'showSocialLinksInFooter',
    label: 'Social Links in Footer',
    description: 'Show social media links in the footer',
    type: 'boolean',
    default: true,
  },
  {
    key: 'showContactInFooter',
    label: 'Contact Info in Footer',
    description: 'Show contact information in the footer',
    type: 'boolean',
    default: true,
  },
];

export const defaultAttributeValues: Record<string, unknown> = {};
for (const attr of defaultAttributes) {
  defaultAttributeValues[attr.key] = attr.default;
}
