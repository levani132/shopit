# Products System

This document describes how products work in the application, including filtering, sorting, and view tracking.

> **⚠️ IMPORTANT:** For products with attributes/variants (size, color, etc.), see `attributes-and-variants.md`.
> That document describes variant stock tracking, category attribute stats, and order processing.

## Overview

Products are the main items for sale in a store. They support:
- Bilingual names and descriptions (Georgian and English)
- Category and subcategory assignment
- Price and sale pricing
- Image galleries
- Stock management
- View count tracking for popularity sorting
- **Attributes and Variants** (see `attributes-and-variants.md`)

## Database Schema

### Product Schema (`libs/api/database/src/lib/schemas/product.schema.ts`)

```typescript
interface Product {
  name: string;                    // Default/fallback name
  nameLocalized?: BilingualText;   // Localized names
  description?: string;            // Default/fallback description
  descriptionLocalized?: BilingualText;
  price: number;                   // Regular price
  salePrice?: number;              // Sale price (when isOnSale is true)
  isOnSale: boolean;
  images: string[];                // Array of image URLs
  stock: number;                   // Available quantity
  isActive: boolean;               // Whether product is visible
  storeId: ObjectId;               // Reference to parent store
  categoryId?: ObjectId;           // Reference to category
  subcategoryId?: ObjectId;        // Reference to subcategory
  viewCount: number;               // Number of views (for popularity)
  orderCount: number;              // Number of orders (for future use)
}
```

## API Endpoints

All product endpoints are at `/api/v1/products`.

### Public Endpoints

- `GET /products/store/:storeId` - List products with filtering and sorting
- `GET /products/:id` - Get a single product
- `POST /products/:id/view` - Increment view count (for popularity tracking)

### Protected Endpoints (Sellers/Admins)

- `GET /products/my-store` - Get all products for current user's store
- `POST /products` - Create a new product (with image upload)
- `PATCH /products/:id` - Update a product
- `DELETE /products/:id` - Delete a product

### Query Parameters for Listing

| Parameter | Type | Description |
|-----------|------|-------------|
| `categoryId` | string | Filter by category ID |
| `subcategoryId` | string | Filter by subcategory ID |
| `minPrice` | number | Minimum price filter |
| `maxPrice` | number | Maximum price filter |
| `sortBy` | enum | Sort order (see below) |
| `search` | string | Full-text search in name/description |
| `onSale` | boolean | Only show products on sale |
| `inStock` | boolean | Only show products in stock |
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (default: 20, max: 100) |

### Sort Options

| Value | Description |
|-------|-------------|
| `relevance` | Text search score (when searching) or popularity |
| `price_asc` | Price low to high |
| `price_desc` | Price high to low |
| `popularity` | Most viewed products first |
| `newest` | Newest products first |

### Response Format

```json
{
  "products": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "filters": {
    "priceRange": {
      "minPrice": 0,
      "maxPrice": 1000
    }
  }
}
```

## Frontend Implementation

### Store Products Page

Located at `apps/web/src/app/store/[subdomain]/[locale]/products/page.tsx`

Features:
- Sidebar with category filters (expandable subcategories)
- Price range inputs
- Quick filters (On Sale, In Stock)
- Sort dropdown
- Responsive grid of product cards
- Pagination
- Breadcrumb navigation
- Mobile-friendly filter toggle

### URL Structure

Products page uses query parameters for all filters:

```
/products                                    # All products
/products?category=<id>                      # Filter by category
/products?category=<id>&subcategory=<id>     # Filter by subcategory
/products?minPrice=10&maxPrice=100           # Price range
/products?sortBy=price_asc                   # Sorting
/products?onSale=true                        # On sale only
/products?search=keyword                     # Search
```

### Category Links in Header

When users click categories in the header dropdown, they navigate to:

```
/products?category=<categoryId>
/products?category=<categoryId>&subcategory=<subcategoryId>
```

This is handled in `StoreHeader.tsx`.

## View Tracking

When a user clicks on a product, the frontend calls:

```typescript
await fetch(`${API_URL}/api/v1/products/${productId}/view`, { method: 'POST' });
```

This increments the `viewCount` field on the product, which is used for:
- Popularity sorting (`sortBy=popularity`)
- Default sorting when no search query is provided

## Important Notes

1. **Indexes** - The product schema has indexes for common query patterns:
   - `storeId + isActive` - Base filter for all queries
   - `storeId + categoryId` - Category filtering
   - `storeId + price` - Price sorting/filtering
   - `storeId + viewCount` - Popularity sorting
   - Text index on `name` and `description` for search

2. **Pagination** - Large result sets are paginated (default 20, max 100 per page)

3. **Price Range** - The API returns the overall min/max prices for the store, allowing the UI to show appropriate filter ranges

4. **Active Products Only** - Public queries only return products where `isActive: true`

## Dashboard Product Management

### Products List Page

Located at `apps/web/src/app/[locale]/dashboard/products/page.tsx`

Features:
- Fetches products from `/products/my-store` API
- Sortable table by clicking column headers:
  - **Product**: Alphabetical by name
  - **Price**: By effective price (sale price if on sale)
  - **Stock**: By quantity
  - **Status**: Active first or Draft first
- Edit and Delete actions per product
- Sort indicators show current sort direction

### New Product Page

Located at `apps/web/src/app/[locale]/dashboard/products/new/page.tsx`

Features:
- Image upload (up to 10 images)
- Bilingual name and description fields (Georgian and English)
- Pricing with sale price option
- Stock quantity management
- Category and subcategory selection
- Form validation
- Redirects to products list after creation

### Edit Product Page

Located at `apps/web/src/app/[locale]/dashboard/products/[id]/page.tsx`

Features:
- Loads existing product data on mount
- Pre-populates all form fields
- **Image management**:
  - Shows existing images from server
  - Allows removing existing images
  - Allows adding new images (marked with "New" badge)
  - First image is marked as "Main"
- **Status toggle**: Active/Draft visibility control
- **Delete functionality** with confirmation modal
- Sends `PATCH /products/:id` with `existingImages` JSON array

### Form Data Handling

Both forms send `multipart/form-data` with:
- Text fields in the body
- `nameLocalized` and `descriptionLocalized` as JSON strings
- Images in the `images` field
- (Edit only) `existingImages` as JSON array of URLs to keep

## File Locations

- **API Service:** `apps/api/src/products/products.service.ts`
- **API Controller:** `apps/api/src/products/products.controller.ts`
- **DTOs:** `apps/api/src/products/dto/product.dto.ts`
- **Store Products Page:** `apps/web/src/app/store/[subdomain]/[locale]/products/page.tsx`
- **Store Homepage Products:** `apps/web/src/components/store/HomepageProducts.tsx`
- **Dashboard Products List:** `apps/web/src/app/[locale]/dashboard/products/page.tsx`
- **Dashboard New Product:** `apps/web/src/app/[locale]/dashboard/products/new/page.tsx`
- **Dashboard Edit Product:** `apps/web/src/app/[locale]/dashboard/products/[id]/page.tsx`
- **Header (Category Links):** `apps/web/src/components/store/StoreHeader.tsx`

## DTO Notes

### BilingualText Validation

The `nameLocalized` and `descriptionLocalized` fields are sent as JSON strings in FormData.
The DTO uses `@Transform(parseJsonTransform)` to parse them, and `@IsObject()` for validation.

**Important**: Do NOT use `@ValidateNested()` with `@Type()` for these fields, as it conflicts with `forbidNonWhitelisted: true` in the ValidationPipe.

```typescript
// Correct approach in product.dto.ts
@IsOptional()
@Transform(parseJsonTransform)
@IsObject()
nameLocalized?: BilingualText;
```

