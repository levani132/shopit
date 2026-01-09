# Categories System

This document describes how categories and subcategories work in the application.

## Overview

Categories are used to organize products in a store. They support:
- One level of nesting (category → subcategory)
- Bilingual names (Georgian and English)
- Drag-and-drop ordering
- Dynamic display in the store header

## Database Schema

### Category Schema (`libs/api/database/src/lib/schemas/category.schema.ts`)

```typescript
interface Category {
  name: string;            // Default/fallback name
  nameLocalized?: {
    ka?: string;           // Georgian name
    en?: string;           // English name
  };
  slug: string;            // URL-friendly identifier
  image?: string;          // Optional category image
  order: number;           // Display order
  storeId: ObjectId;       // Reference to parent store
}
```

### Subcategory Schema (`libs/api/database/src/lib/schemas/subcategory.schema.ts`)

```typescript
interface Subcategory {
  name: string;            // Default/fallback name
  nameLocalized?: {
    ka?: string;           // Georgian name
    en?: string;           // English name
  };
  slug: string;            // URL-friendly identifier
  order: number;           // Display order within category
  categoryId: ObjectId;    // Reference to parent category
}
```

## API Endpoints

All category endpoints are at `/api/v1/categories`.

### Public Endpoints

- `GET /categories/store/:storeId` - Get all categories for a store (with subcategories)

### Protected Endpoints (Sellers/Admins)

- `GET /categories/my-store` - Get categories for current user's store
- `POST /categories` - Create a new category
- `PATCH /categories/:id` - Update a category
- `DELETE /categories/:id` - Delete a category (and its subcategories)
- `POST /categories/reorder` - Reorder categories
- `POST /categories/subcategory` - Create a subcategory
- `PATCH /categories/subcategory/:id` - Update a subcategory
- `DELETE /categories/subcategory/:id` - Delete a subcategory

### Request/Response Examples

**Create Category:**
```json
POST /categories
{
  "name": "Electronics",
  "nameLocalized": {
    "ka": "ელექტრონიკა",
    "en": "Electronics"
  }
}
```

**Create Subcategory:**
```json
POST /categories/subcategory
{
  "name": "Phones",
  "nameLocalized": {
    "ka": "ტელეფონები",
    "en": "Phones"
  },
  "categoryId": "category-id-here"
}
```

## Frontend Implementation

### Dashboard Categories Page

Located at `apps/web/src/app/[locale]/dashboard/categories/page.tsx`

Features:
- Add/edit/delete categories and subcategories
- Bilingual name fields (Georgian and English columns)
- Inline editing
- Subcategory expansion within category cards

### Store Header Categories

The `StoreHeader` component (`apps/web/src/components/store/StoreHeader.tsx`) displays categories in the navigation:

**Desktop:**
- Categories dropdown appears on hover
- Shows category name with subcategories nested below
- Clicking navigates to `/products?category=<id>` or `/products?category=<id>&subcategory=<id>`

**Mobile:**
- Categories expandable section in mobile menu
- Tapping "Categories" expands the full list
- Subcategories are indented under parent categories

### Key Logic

**Show/Hide Categories:**
```typescript
// Only show categories navigation if store has categories
const hasCategories = categories.length > 0;

{hasCategories && (
  // Render categories dropdown
)}
```

**Localized Name Retrieval:**
```typescript
const getCategoryName = (cat: CategoryData) => {
  if (cat.nameLocalized) {
    return (locale === 'ka' ? cat.nameLocalized.ka : cat.nameLocalized.en) || cat.name;
  }
  return cat.name;
};
```

## Categories Flow

1. **Store Layout** (`apps/web/src/app/store/[subdomain]/[locale]/layout.tsx`):
   - Fetches categories via `getCategoriesByStoreId(storeId)`
   - Passes categories to `StoreLayoutContent` and `StoreHeader`

2. **Store Header**:
   - Receives categories as prop
   - If `categories.length > 0`, shows dropdown
   - If no categories, hides the "Categories" nav item entirely

3. **Dashboard**:
   - Sellers manage categories at `/dashboard/categories`
   - Changes reflect on store frontend immediately

## Important Notes

1. **Categories only show if they exist** - The "Categories" link in the store header is completely hidden if the store has no categories.

2. **Subcategories are optional** - A category can exist without any subcategories.

3. **Slug generation** - If no slug is provided, it's auto-generated from the name. Supports Georgian characters.

4. **Ordering** - Categories and subcategories have an `order` field for custom sorting.

5. **Cascading deletes** - Deleting a category also deletes all its subcategories.

## File Locations

- **API Service:** `apps/api/src/categories/categories.service.ts`
- **API Controller:** `apps/api/src/categories/categories.controller.ts`
- **DTOs:** `apps/api/src/categories/dto/category.dto.ts`
- **Dashboard Page:** `apps/web/src/app/[locale]/dashboard/categories/page.tsx`
- **Frontend API:** `apps/web/src/lib/api.ts` (CategoryData, getCategoriesByStoreId)
- **Store Header:** `apps/web/src/components/store/StoreHeader.tsx`

