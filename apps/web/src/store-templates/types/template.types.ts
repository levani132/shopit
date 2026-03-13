import { ReactNode } from 'react';

/**
 * Bilingual text - matches the API's BilingualText shape.
 */
export interface LocalizedText {
  ka?: string;
  en?: string;
}

/**
 * Minimal store data shared across all template components.
 * Templates receive this as a prop - they don't fetch it themselves.
 */
export interface StoreData {
  id: string;
  subdomain: string;
  name: string;
  nameLocalized?: LocalizedText;
  description?: string;
  descriptionLocalized?: LocalizedText;
  aboutUs?: string;
  aboutUsLocalized?: LocalizedText;
  logo?: string;
  coverImage?: string;
  brandColor: string;
  accentColor: string;
  useInitialAsLogo?: boolean;
  useDefaultCover?: boolean;
  authorName?: string;
  authorNameLocalized?: LocalizedText;
  showAuthorName?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  categories?: CategoryData[];
  isVerified?: boolean;
  homepageProductOrder?: string;
  courierType?: string;
  selfPickupEnabled?: boolean;
  location?: { lat: number; lng: number };
}

export interface CategoryData {
  _id: string;
  name: string;
  nameLocalized?: LocalizedText;
  slug: string;
  subcategories: SubcategoryData[];
}

export interface SubcategoryData {
  _id: string;
  name: string;
  nameLocalized?: LocalizedText;
  slug: string;
}

export interface HomepageProduct {
  _id: string;
  name: string;
  nameLocalized?: LocalizedText;
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  images: string[];
  stock: number;
  totalStock?: number;
  hasVariants?: boolean;
  variants?: unknown[];
  viewCount?: number;
  categoryId?: { name: string; nameLocalized?: LocalizedText };
  description?: string;
  descriptionLocalized?: LocalizedText;
}

// ---------------------------------------------------------------------------
// Page slot prop interfaces - the contract between wrappers and templates
// ---------------------------------------------------------------------------

export interface HomePageProps {
  store: StoreData;
  products: HomepageProduct[];
  hasMoreProducts: boolean;
  locale: string;
  subdomain: string;
  storeInitial: string;
  authorInitial: string;
}

export interface ProductsPageProps {
  locale: string;
  subdomain: string;
}

export interface ProductDetailPageProps {
  locale: string;
  subdomain: string;
  productId: string;
}

export interface AboutPageProps {
  locale: string;
  subdomain: string;
}

export interface CartPageProps {
  locale: string;
  subdomain: string;
}

export interface CheckoutPageProps {
  locale: string;
  subdomain: string;
}

export interface WishlistPageProps {
  locale: string;
  subdomain: string;
}

export interface OrdersPageProps {
  locale: string;
  subdomain: string;
}

export interface StatusPageProps {
  locale: string;
  subdomain: string;
  orderId?: string | null;
}

export interface AuthPageProps {
  locale: string;
  subdomain: string;
}

export interface CustomPageProps {
  locale: string;
  subdomain: string;
  slug: string[];
}

// ---------------------------------------------------------------------------
// Layout slot prop interfaces
// ---------------------------------------------------------------------------

export interface LayoutWrapperProps {
  store: {
    id?: string;
    name: string;
    subdomain: string;
    description?: string;
    logo?: string;
    authorName?: string;
    showAuthorName?: boolean;
    phone?: string;
    email?: string;
    address?: string;
    socialLinks?: StoreData['socialLinks'];
    categories?: CategoryData[];
    initial?: string;
    authorInitial?: string;
  };
  accentColors: React.CSSProperties;
  locale: string;
  children: ReactNode;
}

export interface HeaderProps {
  store: LayoutWrapperProps['store'];
}

export interface FooterProps {
  store: LayoutWrapperProps['store'];
  locale: string;
}

// ---------------------------------------------------------------------------
// Template definition
// ---------------------------------------------------------------------------

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  version: string;

  /** Required page slots - templates MUST provide these. */
  pages: {
    home: React.ComponentType<HomePageProps>;
    products: React.ComponentType<ProductsPageProps>;
    productDetail: React.ComponentType<ProductDetailPageProps>;
    about: React.ComponentType<AboutPageProps>;
  };

  /**
   * Optional page slots. If a template doesn't provide one of these,
   * the registry falls back to the shared default implementation.
   */
  optionalPages?: {
    cart?: React.ComponentType<CartPageProps>;
    checkout?: React.ComponentType<CheckoutPageProps>;
    wishlist?: React.ComponentType<WishlistPageProps>;
    orders?: React.ComponentType<OrdersPageProps>;
    checkoutSuccess?: React.ComponentType<StatusPageProps>;
    checkoutFail?: React.ComponentType<StatusPageProps>;
    login?: React.ComponentType<AuthPageProps>;
    register?: React.ComponentType<AuthPageProps>;
    comingSoon?: React.ComponentType<StatusPageProps>;
    notFound?: React.ComponentType<StatusPageProps>;
  };

  /**
   * Additional pages this template introduces (rendered via catch-all route).
   * Keys are slug patterns, e.g. "blog", "reviews", "gallery".
   */
  customPages?: Record<string, React.ComponentType<CustomPageProps>>;

  /** Layout components wrapping every store page. */
  layout: {
    wrapper: React.ComponentType<LayoutWrapperProps>;
    header: React.ComponentType<HeaderProps>;
    footer: React.ComponentType<FooterProps>;
  };

  /** Attribute schema this template supports. */
  attributes: TemplateAttributeDefinition[];

  /** Default values for each attribute. */
  defaultAttributeValues: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Template attributes (configurable per-store settings)
// ---------------------------------------------------------------------------

export type TemplateAttributeType =
  | 'boolean'
  | 'string'
  | 'number'
  | 'select'
  | 'color';

export interface TemplateAttributeDefinition {
  key: string;
  label: string;
  description?: string;
  type: TemplateAttributeType;
  default: unknown;
  options?: string[];
  min?: number;
  max?: number;
}
