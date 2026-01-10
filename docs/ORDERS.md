# Orders Page Documentation

## Overview

The Orders page (`/store/[subdomain]/[locale]/orders`) displays a user's order history for a specific store. It includes several user-friendly features to enhance the order tracking experience.

## Features

### 1. Store-Filtered Orders

Orders are filtered by the current store subdomain. Users only see orders from the store they're currently browsing.

**API Endpoint**: `GET /api/v1/orders/my-orders?storeSubdomain={subdomain}`

### 2. Order Items as Links

Each order item is clickable and navigates to the product page, allowing users to easily repurchase or view the product again.

```tsx
<Link href={`/store/${subdomain}/${locale}/products/${item.productId}`}>
  {/* Order item content */}
</Link>
```

### 3. Status Timeline

A horizontal timeline visualizes the order's progression through different statuses:

- **Pending** → **Paid** → **Processing** → **Shipped** → **Delivered**

For cancelled or refunded orders, a simple badge is shown instead of the timeline.

**Component**: `StatusTimeline`

```tsx
<StatusTimeline currentStatus={order.status} t={t} />
```

### 4. Localized Date Formatting

Dates are displayed in the user's locale:

- **Georgian (ka)**: "10 იანვარი, 2026"
- **English (en)**: "January 10, 2026"

**Function**: `formatDateLocalized(dateString, locale)`

Georgian month names are defined locally since `toLocaleDateString` may not fully support Georgian:

```typescript
const georgianMonths = [
  'იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი',
  'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'
];
```

### 5. Expandable Order Footer

The order footer includes an expandable section that shows:

- **Shipping Details**: Full address, city, postal code, country, phone number
- **Price Breakdown**: Subtotal, shipping cost, total

**Component**: `OrderFooter`

The footer is collapsed by default to keep the UI clean, with a click-to-expand interaction.

## Order Interface

```typescript
interface Order {
  _id: string;
  orderItems: OrderItem[];
  itemsPrice: number;      // Sum of item prices
  shippingPrice: number;   // Delivery cost
  totalPrice: number;      // itemsPrice + shippingPrice
  status: string;
  isPaid: boolean;
  paidAt?: string;
  isDelivered: boolean;
  deliveredAt?: string;
  createdAt: string;
  shippingDetails: {
    address: string;
    city: string;
    country: string;
    postalCode?: string;
    phoneNumber?: string;
  };
}

interface OrderItem {
  productId: string;
  name: string;
  nameEn?: string;
  image: string;
  qty: number;
  price: number;
  variantAttributes?: Array<{
    attributeName: string;
    value: string;
  }>;
}
```

## Order Statuses

| Status | Description | Color |
|--------|-------------|-------|
| `pending` | Order created, awaiting payment | Yellow |
| `paid` | Payment successful | Blue |
| `processing` | Seller is preparing the order | Purple |
| `shipped` | Order shipped by courier | Indigo |
| `delivered` | Order delivered to customer | Green |
| `cancelled` | Order cancelled | Red |
| `refunded` | Order refunded | Gray |

## Translations

New translation keys added for this feature:

| Key | English | Georgian |
|-----|---------|----------|
| `orders.viewDetails` | View Details | დეტალების ნახვა |
| `orders.shippingDetails` | Shipping Details | მიტანის დეტალები |
| `orders.priceBreakdown` | Price Breakdown | ფასის დეტალები |
| `orders.subtotal` | Subtotal | პროდუქტების ფასი |
| `orders.shipping` | Shipping | მიტანა |
| `orders.free` | Free | უფასო |

## File Locations

- **Page Component**: `apps/web/src/app/store/[subdomain]/[locale]/orders/page.tsx`
- **Translations (KA)**: `apps/web/src/messages/ka.json` → `orders` section
- **Translations (EN)**: `apps/web/src/messages/en.json` → `orders` section

## Usage

The page automatically:
1. Detects the store subdomain from the URL
2. Checks if the user is authenticated
3. Fetches orders filtered by the current store
4. Displays orders with the timeline and expandable details

No props or configuration needed - it works based on route parameters.

