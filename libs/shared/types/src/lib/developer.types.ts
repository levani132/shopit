/**
 * Developer Portal & Template Marketplace type definitions
 */

// ---------------------------------------------------------------------------
// Developer Profile
// ---------------------------------------------------------------------------

export interface DeveloperProfileEarnings {
  total: number;
  pending: number;
  withdrawn: number;
}

export interface DeveloperBankDetails {
  accountName: string;
  iban: string;
  bankName: string;
}

export type DeveloperStatus = 'pending' | 'approved' | 'suspended';

export interface DeveloperProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: { ka?: string; en?: string };
  website?: string;
  githubUsername?: string;
  avatar?: string;
  status: DeveloperStatus;
  earnings: DeveloperProfileEarnings;
  bankDetails?: DeveloperBankDetails;
  templatesCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDeveloperProfileDto {
  displayName: string;
  bio?: { ka?: string; en?: string };
  website?: string;
  githubUsername?: string;
}

export interface UpdateDeveloperProfileDto {
  displayName?: string;
  bio?: { ka?: string; en?: string };
  website?: string;
  githubUsername?: string;
  avatar?: string;
  bankDetails?: DeveloperBankDetails;
}

// ---------------------------------------------------------------------------
// Template Marketplace Listing
// ---------------------------------------------------------------------------

export type TemplatePricingType = 'free' | 'monthly' | 'one_time';

export interface TemplateListingPricing {
  type: TemplatePricingType;
  price: number;
}

export interface TemplateListingStats {
  installs: number;
  rating: number;
  reviewCount: number;
  activeSubscriptions: number;
}

export type TemplateListingStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'rejected'
  | 'suspended';

export interface MarketplaceAttributeSchema {
  key: string;
  type: string;
  label: { ka?: string; en?: string };
  description?: { ka?: string; en?: string };
  group?: string;
  default?: unknown;
  options?: { value: string; label: { ka?: string; en?: string } }[];
  validation?: {
    required?: boolean;
    min?: number;
    max?: number;
    pattern?: string;
  };
  showIf?: {
    key: string;
    value: unknown;
  };
}

export interface TemplateMarketplaceListing {
  id: string;
  templateSlug: string;
  developerId: string;
  name: { ka?: string; en?: string };
  description: { ka?: string; en?: string };
  longDescription?: { ka?: string; en?: string };
  thumbnail?: string;
  screenshots: string[];
  demoStoreUrl?: string;
  version: string;
  pricing: TemplateListingPricing;
  stats: TemplateListingStats;
  status: TemplateListingStatus;
  rejectionReason?: string;
  bundleUrl?: string;
  githubRepo?: string;
  attributeSchema: MarketplaceAttributeSchema[];
  categories: string[];
  tags: string[];
  sdkVersion: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateListingDto {
  templateSlug: string;
  name: { ka?: string; en?: string };
  description: { ka?: string; en?: string };
  longDescription?: { ka?: string; en?: string };
  pricing: TemplateListingPricing;
  categories?: string[];
  tags?: string[];
  attributeSchema?: MarketplaceAttributeSchema[];
  githubRepo?: string;
}

export interface UpdateTemplateListingDto {
  name?: { ka?: string; en?: string };
  description?: { ka?: string; en?: string };
  longDescription?: { ka?: string; en?: string };
  thumbnail?: string;
  screenshots?: string[];
  demoStoreUrl?: string;
  version?: string;
  pricing?: TemplateListingPricing;
  categories?: string[];
  tags?: string[];
  attributeSchema?: MarketplaceAttributeSchema[];
  githubRepo?: string;
}

// ---------------------------------------------------------------------------
// Template Purchase
// ---------------------------------------------------------------------------

export type TemplatePurchaseStatus =
  | 'active'
  | 'cancelled'
  | 'expired'
  | 'past_due';

export interface TemplatePurchase {
  id: string;
  sellerId: string;
  storeId: string;
  listingId: string;
  type: TemplatePricingType;
  price: number;
  platformFee: number;
  developerShare: number;
  status: TemplatePurchaseStatus;
  startDate: string;
  endDate?: string;
  nextBillingDate?: string;
  bogOrderId?: string;
  cancelledAt?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Developer Payout
// ---------------------------------------------------------------------------

export type DeveloperPayoutStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed';

export interface PayoutBreakdownItem {
  purchaseId: string;
  amount: number;
  type: 'monthly' | 'one_time';
}

export interface DeveloperPayout {
  id: string;
  developerId: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  status: DeveloperPayoutStatus;
  periodStart: string;
  periodEnd: string;
  breakdown: PayoutBreakdownItem[];
  bogDocumentId?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Template Review
// ---------------------------------------------------------------------------

export interface TemplateReview {
  id: string;
  listingId: string;
  sellerId: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateReviewDto {
  rating: number;
  title: string;
  body: string;
}

export interface UpdateTemplateReviewDto {
  rating?: number;
  title?: string;
  body?: string;
}

// ---------------------------------------------------------------------------
// Template Marketplace Filters
// ---------------------------------------------------------------------------

export interface TemplateMarketplaceFilters {
  search?: string;
  category?: string;
  pricingType?: TemplatePricingType;
  minRating?: number;
  sortBy?: 'popular' | 'newest' | 'rating' | 'price_asc' | 'price_desc';
  page?: number;
  limit?: number;
}
