# Store Management

## Overview

Stores are the core entity of the platform. Each seller has one store with a unique subdomain.

## Store Schema

Located at: `libs/api/database/src/lib/schemas/store.schema.ts`

### Key Fields

```typescript
{
  subdomain: string;          // Unique, lowercase (e.g., "mystore")
  name: string;               // Legacy/default name
  nameLocalized?: {           // Bilingual name
    ka?: string;              // Georgian
    en?: string;              // English
  };
  description?: string;       // Legacy/default description
  descriptionLocalized?: {    // Bilingual description
    ka?: string;
    en?: string;
  };
  authorName?: string;        // Legacy/default author name
  authorNameLocalized?: {     // Bilingual author name
    ka?: string;
    en?: string;
  };
  logo?: string;              // Logo URL (S3)
  coverImage?: string;        // Cover image URL (S3)
  brandColor: string;         // Color name (e.g., "indigo")
  accentColor: string;        // Hex color (e.g., "#6366f1")
  useInitialAsLogo: boolean;  // Use first letter as logo
  useDefaultCover: boolean;   // Use colored gradient as cover
  showAuthorName: boolean;    // Display author name on storefront
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };
  phone?: string;
  address?: string;
  homepageProductOrder: string; // 'popular', 'newest', 'price_asc', 'price_desc', 'random'
  ownerId: ObjectId;          // Reference to User
}
```

## Bilingual Content

The store supports bilingual content for Georgian (ka) and English (en):
- `nameLocalized`
- `descriptionLocalized`
- `authorNameLocalized`

Legacy fields (`name`, `description`, `authorName`) are kept for backward compatibility and are auto-populated from the English version when updating.

## API Endpoints

### Get Current User's Store
```
GET /stores/my-store
Authorization: Bearer <token>
```

### Update Current User's Store
```
PATCH /stores/my-store
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- name, nameKa, nameEn
- description, descriptionKa, descriptionEn
- authorName, authorNameKa, authorNameEn
- brandColor
- useInitialAsLogo, useDefaultCover, showAuthorName
- phone, address
- socialLinks (JSON string)
- logoFile (file)
- coverFile (file)
```

### Get Store by Subdomain
```
GET /stores/subdomain/:subdomain
```

## Dashboard Settings Page

Located at: `apps/web/src/app/[locale]/dashboard/store/page.tsx`

Features:
- **Branding Section**: Logo upload, cover image upload, brand color picker
- **Store Information**: Bilingual fields (Georgian/English) for name, description, author name
- **Contact Information**: Phone, address
- **Social Media Links**: Facebook, Instagram, TikTok, Twitter
- **Homepage Product Display**: Choose product ordering (see below)
- **Store URL**: Read-only subdomain display with copy button

## Homepage Product Order

Controls how products are displayed on the store homepage (up to 6 products).

### Options

| Value | Label | Description |
|-------|-------|-------------|
| `popular` | Most Popular (with variety) | Shows most viewed with slight randomness |
| `newest` | Newest First | Most recently added products |
| `price_asc` | Price: Low to High | Cheapest products first |
| `price_desc` | Price: High to Low | Most expensive products first |
| `random` | Random | True random selection each time |

### How Popularity Works

The "popular" order (default):
1. Fetches 2x the requested limit sorted by `viewCount` descending
2. Shuffles the results slightly using partial Fisher-Yates
3. Returns the first N items

This provides variety while still prioritizing popular products.

### API Endpoint

```
GET /products/store/:storeId/homepage?order=popular&limit=6
```

### Frontend Component

`apps/web/src/components/store/HomepageProducts.tsx`

- Shows up to 6 products in a grid
- "See All" button only appears when `hasMore` is true (more than 6 products)
- Uses store accent colors for pricing and badges

## Frontend Localization

The store pages use locale-aware content based on the URL locale (`/ka/` or `/en/`).

### Helper Function
```typescript
function getLocalizedText(
  localized: { ka?: string; en?: string } | undefined,
  fallback: string | undefined,
  locale: string
): string {
  if (localized) {
    return (locale === 'ka' ? localized.ka : localized.en) || fallback || '';
  }
  return fallback || '';
}
```

### Files Using Localization
- `apps/web/src/app/store/[subdomain]/[locale]/layout.tsx` - Passes localized content to header
- `apps/web/src/app/store/[subdomain]/[locale]/page.tsx` - Uses localized content in hero, etc.

## Contact Info & Social Links Display

Contact information and social links are displayed in the **store footer**, not in the main content.

Component: `apps/web/src/components/store/StoreFooter.tsx`

Shows:
- Phone number (clickable tel: link)
- Address
- Social links (Facebook, Instagram, TikTok, Twitter) with branded icons

**Note**: The `StoreContactInfo` component was removed. All contact info is now consolidated in the footer.

## Store Footer Translations

The store footer uses translations from the `store` section in the message files:

```json
// messages/en.json
{
  "store": {
    "quickLinks": "Quick Links",
    "products": "Products",
    "categories": "Categories",
    "aboutUs": "About Us",
    "contact": "Contact",
    "followUs": "Follow Us",
    "allRightsReserved": "All rights reserved.",
    "poweredBy": "Powered by"
  }
}
```

The store layout wraps children with `NextIntlClientProvider` to enable translations in store components.

## Language Switcher

The store header has a language switcher that works differently from the main site:

**Location**: `apps/web/src/components/store/StoreHeader.tsx` → `LanguageSwitcher` component

### How It Works

1. **Detects current locale** from (in order):
   - URL path (e.g., `/en/` or `/ka/`)
   - Cookie (`NEXT_LOCALE`)
   - HTML `lang` attribute (set by server)

2. **Switches locale** by:
   - Setting the `NEXT_LOCALE` cookie
   - Navigating to the correct URL with the new locale

### URL Structure

Store pages have locale in the visible URL:
- `sample.localhost:3000/` → defaults to Georgian
- `sample.localhost:3000/en/` → English
- `sample.localhost:3000/ka/` → Georgian

The middleware rewrites these internally to `/store/sample/[locale]/...`

### Key Code

```typescript
const switchLocale = (newLocale: 'en' | 'ka') => {
  document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=...`;
  
  if (hasLocaleInUrl) {
    // Replace locale in URL
    const newPath = currentPath.replace(/\/en(\/|$)/, `/${newLocale}$1`);
    window.location.href = newPath;
  } else {
    // Add locale to URL
    window.location.href = `/${newLocale}/`;
  }
};
```

## Backend Files

- `apps/api/src/stores/stores.controller.ts` - API endpoints
- `apps/api/src/stores/stores.service.ts` - Business logic
- `apps/api/src/stores/stores.module.ts` - Module configuration

