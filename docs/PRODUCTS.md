# Products Documentation

## Overview

The products system supports both simple products and products with variants. It includes features for managing products in the seller dashboard and displaying them on the storefront.

## Product Cards

### ProductCard Component

Location: `apps/web/src/components/store/ProductCard.tsx`

A shared component used in both the homepage and products listing page for consistent display.

#### Props

```typescript
interface ProductCardProps {
  product: ProductCardData;
  locale: string;
  subdomain: string;
  storeId?: string;
  storeName?: string;
  showBuyNow?: boolean;
}

interface ProductCardData {
  _id: string;
  name: string;
  nameLocalized?: { ka?: string; en?: string };
  price: number;
  salePrice?: number;
  isOnSale: boolean;
  images: string[];
  stock: number;
  totalStock?: number;      // For variant products
  hasVariants?: boolean;
  variantsCount?: number;   // Number of variants
}
```

#### Button Logic

The card displays different buttons based on the product type:

| Condition | Buttons Shown |
|-----------|---------------|
| No variants OR 1 variant | 🛒 (icon) + "Buy Now" |
| 2+ variants | "Choose Options" (full width) |
| Out of stock | Buttons disabled |

**Add to Cart (icon)**: Adds product to cart, stays on page
**Buy Now**: Adds to cart AND redirects to checkout
**Choose Options**: Links to product detail page for variant selection

### Homepage Grid

The homepage displays 8 products in a 2x4 grid (2 columns on mobile, 4 on desktop).

```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
  {products.map((product) => (
    <ProductCard ... />
  ))}
</div>
```

### Products Page Grid

The products listing uses a responsive grid: 2 columns on mobile, 3 on tablet, 4 on desktop.

```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
```

## Stock Calculation

For products with variants, the effective stock is calculated from `totalStock`:

```typescript
const effectiveStock = product.hasVariants
  ? (product.totalStock ?? 0)
  : product.stock;
const isOutOfStock = effectiveStock <= 0;
```

## Out of Stock Variants

### Storefront (Product Detail Page)

- Variant options that are out of stock are **disabled**
- Text options show strikethrough styling
- Color swatches show a diagonal line overlay
- Hovering displays "Out of stock" tooltip

### Dashboard (Variant Editor)

- Each variant group shows stock status badge ("Stock: X" or "Out of Stock")
- Image upload warning only shows for groups with in-stock variants
- Message displayed: "Images are optional for out-of-stock variants"

## Product Deletion

### Dashboard Products List

Location: `apps/web/src/app/[locale]/dashboard/products/page.tsx`

- Delete button on each product row
- Confirmation modal before deletion
- Loading state during deletion
- Product removed from list after successful deletion

### Dashboard Product Edit Page

Location: `apps/web/src/app/[locale]/dashboard/products/[id]/page.tsx`

- Delete button in the header
- Same confirmation modal pattern
- Redirects to products list after deletion

### API Endpoint

```
DELETE /api/v1/products/:id
```

Requires authentication. Only the store owner can delete their products.

## Product Detail Page

Location: `apps/web/src/app/store/[subdomain]/[locale]/products/[id]/page.tsx`

### Features

- Image gallery with thumbnails
- Variant selection (color swatches, text options)
- Quantity selector
- Add to Cart button (icon) + Buy Now button
- Stock status display
- Price with sale pricing support
- Description section

### Buy Now Flow

1. User clicks "Buy Now"
2. Product added to cart with selected variant (if applicable)
3. User redirected to `/checkout`

## Translations

| Key | English | Georgian |
|-----|---------|----------|
| `store.buyNow` | Buy Now | ყიდვა |
| `store.addToCart` | Add to Cart | კალათაში დამატება |
| `store.chooseOptions` | Choose Options | არჩევა |
| `store.selectOptions` | Options | არჩევა |
| `store.outOfStock` | Out of Stock | არ არის მარაგში |
| `dashboard.deleteProduct` | Delete Product | პროდუქტის წაშლა |
| `dashboard.deleteProductConfirm` | Are you sure? | დარწმუნებული ხართ? |
| `dashboard.deleting` | Deleting... | იშლება... |

## File Locations

- **ProductCard Component**: `apps/web/src/components/store/ProductCard.tsx`
- **Homepage Products**: `apps/web/src/components/store/HomepageProducts.tsx`
- **Products Page**: `apps/web/src/app/store/[subdomain]/[locale]/products/page.tsx`
- **Product Detail**: `apps/web/src/app/store/[subdomain]/[locale]/products/[id]/page.tsx`
- **Dashboard Products List**: `apps/web/src/app/[locale]/dashboard/products/page.tsx`
- **Dashboard Product Edit**: `apps/web/src/app/[locale]/dashboard/products/[id]/page.tsx`
- **Variant Editor**: `apps/web/src/components/dashboard/VariantEditor.tsx`

