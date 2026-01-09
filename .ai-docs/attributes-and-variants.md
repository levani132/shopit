# Product Attributes and Variants System

## Overview

This document describes the product attributes and variants system for ShopIt. This allows sellers to create customizable products with options like size, color, material, etc.

## Core Concepts

### 1. Attributes

An **Attribute** is a customizable property that products can have (e.g., Size, Color, Material, Gender).

```typescript
interface Attribute {
  _id: ObjectId;
  storeId: ObjectId;           // Which store owns this attribute
  name: string;                // e.g., "Size", "Color"
  nameLocalized?: {
    ka?: string;
    en?: string;
  };
  slug: string;                // URL-friendly: "size", "color"
  type: 'text' | 'color';      // Display type
  requiresImage: boolean;      // If true, each value needs a product image
  values: AttributeValue[];    // Possible values for this attribute
  order: number;               // Display order in filters
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface AttributeValue {
  _id: ObjectId;
  value: string;               // e.g., "XL", "Red"
  valueLocalized?: {
    ka?: string;
    en?: string;
  };
  slug: string;                // URL-friendly: "xl", "red"
  colorHex?: string;           // Only for type: 'color', e.g., "#FF0000"
  order: number;               // Display order
}
```

### Attribute Types

| Type | Description | Use Cases | Display |
|------|-------------|-----------|---------|
| `text` | Standard text values | Size, Material, Gender, Brand | Text labels/chips |
| `color` | Color with hex code | Color variants | Color swatches |

**Future types to consider:**
- `number` - For numeric ranges (weight, dimensions)
- `boolean` - For yes/no options (gift wrapping, express shipping)

### 2. Product Variants

When a product has attributes, it creates **Variants** - specific combinations of attribute values.

Example: T-Shirt with Size (S, M, L) and Color (Red, Blue)
- Creates 6 variants: S-Red, S-Blue, M-Red, M-Blue, L-Red, L-Blue

```typescript
interface ProductVariant {
  _id: ObjectId;
  productId: ObjectId;
  sku: string;                 // Unique stock keeping unit
  attributes: {
    attributeId: ObjectId;
    attributeName: string;     // Denormalized for queries
    valueId: ObjectId;
    value: string;             // Denormalized for display
    colorHex?: string;         // For color attributes
  }[];
  price?: number;              // Override product base price
  salePrice?: number;          // Override product sale price
  stock: number;               // Stock for this specific variant
  images: string[];            // Variant-specific images
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. Product with Attributes

Products are extended to support attributes:

```typescript
interface Product {
  // ... existing fields ...
  
  // Attribute configuration for this product
  productAttributes: {
    attributeId: ObjectId;
    selectedValues: ObjectId[];  // Which values apply to this product
  }[];
  
  // Generated variants (combinations)
  hasVariants: boolean;
  variants?: ProductVariant[];
  
  // Total stock across all variants (computed)
  totalStock: number;
}
```

## Category Attribute Tracking

### Why Track Attributes Per Category?

To enable efficient filtering on category pages without querying all products:
1. Know which attribute filters to display
2. Show count of products per filter value
3. Enable faceted search

### Category Attribute Stats Schema

```typescript
interface CategoryAttributeStats {
  _id: ObjectId;
  categoryId: ObjectId;        // Category or subcategory
  storeId: ObjectId;
  attributeId: ObjectId;
  attributeName: string;       // Denormalized
  attributeSlug: string;
  attributeType: 'text' | 'color';
  values: {
    valueId: ObjectId;
    value: string;             // Denormalized
    valueSlug: string;
    colorHex?: string;
    count: number;             // Number of in-stock products with this value
  }[];
  totalProducts: number;       // Total products with this attribute in category
  updatedAt: Date;
}
```

### When to Update Category Attribute Stats

**IMPORTANT: These updates must happen in the following scenarios:**

| Event | Action |
|-------|--------|
| Product created with attributes | Increment counts for category + values |
| Product deleted | Decrement counts |
| Product moved to different category | Decrement old, increment new |
| Product variant stock changes (0 → positive) | Increment if was out of stock |
| Product variant stock changes (positive → 0) | Decrement if now out of stock |
| Product variant sold | Update stock, potentially decrement if sold out |
| Product activated/deactivated | Increment/decrement accordingly |
| Attribute value added to product | Increment count |
| Attribute value removed from product | Decrement count |

### Update Logic Pseudocode

```typescript
async function updateCategoryAttributeStats(
  categoryId: ObjectId,
  storeId: ObjectId,
  attributeId: ObjectId,
  valueId: ObjectId,
  delta: number // +1 or -1
) {
  await CategoryAttributeStats.findOneAndUpdate(
    { categoryId, storeId, attributeId },
    {
      $inc: {
        'values.$[val].count': delta,
        totalProducts: delta
      }
    },
    {
      arrayFilters: [{ 'val.valueId': valueId }],
      upsert: true
    }
  );
  
  // Also update parent category if this is a subcategory
  if (parentCategoryId) {
    await updateCategoryAttributeStats(parentCategoryId, storeId, attributeId, valueId, delta);
  }
}
```

## API Endpoints

### Attributes CRUD

```
POST   /api/v1/attributes              - Create attribute
GET    /api/v1/attributes/my-store     - List store's attributes
GET    /api/v1/attributes/:id          - Get attribute details
PATCH  /api/v1/attributes/:id          - Update attribute
DELETE /api/v1/attributes/:id          - Delete attribute

POST   /api/v1/attributes/:id/values   - Add value to attribute
PATCH  /api/v1/attributes/:id/values/:valueId - Update value
DELETE /api/v1/attributes/:id/values/:valueId - Delete value
```

### Product Variants

```
GET    /api/v1/products/:id/variants   - Get product variants
POST   /api/v1/products/:id/variants   - Create/update variants (bulk)
PATCH  /api/v1/products/:id/variants/:variantId - Update specific variant
DELETE /api/v1/products/:id/variants/:variantId - Delete variant
```

### Category Filters

```
GET    /api/v1/categories/:id/filters  - Get available filters for category
```

## Frontend Implementation

### Dashboard: Attribute Management

Location: `/dashboard/attributes`

Features:
- List all store attributes
- Create new attribute with type selection
- Add/edit/remove attribute values
- Reorder attributes and values
- Mark attributes as requiring images

### Dashboard: Product Edit with Variants

When editing a product:

1. **Select Attributes** - Choose which attributes apply to this product
2. **Select Values** - For each attribute, select applicable values
3. **Generate Variants** - Auto-generate all combinations
4. **Configure Variants** - For each variant:
   - Set stock quantity
   - Set price override (optional)
   - Upload images (if attribute requires images)

### Store: Product Page with Variants

- Display attribute selectors (dropdowns, color swatches)
- Update price when variant selected
- Show stock status per variant
- Show variant-specific images
- "Add to Cart" creates order item with variant ID

### Store: Category Filters

- Fetch filters from `/api/v1/categories/:id/filters`
- Display relevant attribute filters with counts
- Update product list when filters change
- Show count in parentheses: "Red (12)"

## Database Indexes

```javascript
// Attributes
{ storeId: 1, slug: 1 } // unique
{ storeId: 1, order: 1 }

// Product Variants
{ productId: 1 }
{ productId: 1, sku: 1 } // unique
{ 'attributes.attributeId': 1, 'attributes.valueId': 1 }

// Category Attribute Stats
{ categoryId: 1, storeId: 1, attributeId: 1 } // unique
{ storeId: 1, attributeId: 1 }
```

## Order Integration

When processing orders with variants:

```typescript
interface OrderItem {
  productId: ObjectId;
  variantId?: ObjectId;        // If product has variants
  variantAttributes?: {        // Denormalized for display
    attributeName: string;
    value: string;
  }[];
  quantity: number;
  price: number;               // Variant price at time of order
  // ... other fields
}
```

### Stock Updates on Order

```typescript
async function processOrderItem(item: OrderItem) {
  if (item.variantId) {
    // Update variant stock
    const variant = await ProductVariant.findByIdAndUpdate(
      item.variantId,
      { $inc: { stock: -item.quantity } }
    );
    
    // Update category stats if variant went out of stock
    if (variant.stock <= 0 && variant.stock + item.quantity > 0) {
      await updateCategoryAttributeStatsForVariant(variant, -1);
    }
  } else {
    // Update product stock directly
    await Product.findByIdAndUpdate(
      item.productId,
      { $inc: { stock: -item.quantity } }
    );
  }
}
```

## Migration Considerations

When adding this feature to existing products:
- Existing products without attributes continue to work as-is
- `hasVariants: false` by default
- Stock tracking falls back to product-level stock

## Implementation Status

### Phase 1: Attributes Management ✅ COMPLETED
- Created Attribute schema with type (text/color), requiresImage flag
- Created AttributeValue embedded schema with colorHex support
- Implemented AttributesModule with full CRUD operations
- Added API endpoints for attributes and values management
- Dashboard UI for managing attributes with drag-and-drop reordering

### Phase 2: Product Variants Integration ✅ COMPLETED
- Extended Product schema with productAttributes, hasVariants, variants fields
- Added ProductVariant embedded schema
- Updated ProductsService with variant generation (Cartesian product)
- Added variant API endpoints
- Created VariantEditor component for dashboard
- Integrated into new and edit product pages

### Phase 3: Category Filter Stats ✅ COMPLETED
- Created CategoryAttributeStats schema with value counts
- Created CategoryStatsService with update/rebuild methods
- Integrated stats updates into product create/delete
- Added `/api/v1/categories/:id/filters/:storeId` endpoint
- Added attribute filtering to product list (`?attributes=color:red|size:xl`)

### Phase 4: Store Frontend Variant Selection ⏳ PENDING
- Product page variant selector
- Price and stock updates on selection
- Variant-specific images
- Add to cart with variant ID

## Testing Checklist

- [x] Create attribute with text type
- [x] Create attribute with color type (with hex codes)
- [x] Create product with multiple attributes
- [x] Verify variant generation is correct
- [x] Update variant stock individually
- [ ] Verify category filter stats update on product create
- [ ] Verify category filter stats update on product delete
- [ ] Verify category filter stats update on stock changes
- [ ] Test order placement with variant
- [ ] Test stock reduction on order
- [ ] Test filter display on category page
- [ ] Test product page variant selection

## Related Documentation

- See `products.md` for base product structure
- See `categories.md` for category management
- See `orders.md` (to be created) for order processing

