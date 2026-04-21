import type { LocalizedText, TemplateAttributeDefinition } from './template.types.js';

/**
 * Template manifest — the `shopit.template.json` file in each template project.
 * Contains marketplace metadata, not runtime components.
 */
export interface TemplateManifest {
  /** Unique template identifier (slug-style, e.g. "modern-boutique"). */
  id: string;

  /** Template display name (bilingual). */
  name: LocalizedText;

  /** Short description for marketplace listing (bilingual). */
  description: LocalizedText;

  /** Template version (semver). */
  version: string;

  /** Template author display name. */
  author: string;

  /** Minimum SDK version required. */
  sdkVersion: string;

  /** Template category for marketplace filtering. */
  category: 'general' | 'fashion' | 'electronics' | 'food' | 'services' | 'handmade' | 'other';

  /** Tags for search (e.g. ["minimal", "dark-mode", "multi-language"]). */
  tags?: string[];

  /** Pricing configuration. */
  pricing: {
    type: 'free' | 'one-time' | 'subscription';
    /** Price in GEL. Required for paid templates. */
    price?: number;
    /** Monthly price for subscription type. */
    monthlyPrice?: number;
  };

  /** Paths to visual assets relative to project root. */
  assets: {
    /** Main thumbnail image (recommended: 800x600). */
    thumbnail: string;
    /** Screenshot images for marketplace gallery. */
    screenshots?: string[];
    /** Preview video URL (optional). */
    previewVideo?: string;
  };

  /** Entry point for the template bundle (relative path). */
  main: string;

  /** Attribute schema — the configurable settings for this template. */
  attributes?: TemplateAttributeDefinition[];

  /** Required pages this template provides (must match TemplateDefinition.pages keys). */
  pages: ('home' | 'products' | 'productDetail' | 'about')[];

  /** Optional pages this template overrides. */
  optionalPages?: (
    | 'cart'
    | 'checkout'
    | 'wishlist'
    | 'orders'
    | 'checkoutSuccess'
    | 'checkoutFail'
    | 'login'
    | 'register'
    | 'comingSoon'
    | 'notFound'
  )[];

  /** Custom page slugs this template introduces. */
  customPages?: string[];

  /** Changelog entries. */
  changelog?: {
    version: string;
    date: string;
    changes: string[];
  }[];
}
