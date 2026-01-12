# Orders Page Documentation

## Overview

The Orders page (`/store/[subdomain]/[locale]/orders`) displays a user's order history for a specific store. It includes several user-friendly features to enhance the order tracking experience.

## Features

### 1. Store-Filtered Orders

Orders are filtered by the current store subdomain. Users only see orders from the store they're currently browsing.

**API Endpoint**: `GET /api/v1/orders/my-orders?storeSubdomain={subdomain}`

### 2. Cancelled Orders Filter

Cancelled orders are hidden by default to keep the order list clean. A checkbox appears in the page header (only when there are cancelled orders) allowing users to toggle visibility:

- **Default**: Cancelled orders are hidden
- **Toggle**: "Show cancelled orders" checkbox
- **Empty state**: If a user only has cancelled orders, a special message is shown prompting them to enable the filter

```tsx
const [showCancelled, setShowCancelled] = useState(false);

const filteredOrders = useMemo(() => {
  if (showCancelled) return orders;
  return orders.filter((order) => order.status !== 'cancelled');
}, [orders, showCancelled]);
```

### 2. Payment Retry for Pending Orders

Orders in "pending" status display a "Pay Now" button that allows users to retry payment if their initial payment failed or was abandoned.

**Flow**:

1. User clicks "Pay Now" on a pending order
2. Frontend calls `POST /api/v1/payments/retry/{orderId}` with success/fail URLs
3. Payment page opens in a new tab/popup
4. PaymentAwaitingModal appears showing a spinning loader
5. Modal polls `GET /api/v1/payments/order-status/{orderId}` every 2 seconds
6. When payment completes, modal shows success/failure and refreshes orders

**API Endpoints**:

- `POST /api/v1/payments/retry/:orderId` - Creates new BOG payment for existing order
- `GET /api/v1/payments/order-status/:orderId` - Returns current payment status for polling

### 3. Payment Awaiting Modal

A full-screen modal that appears while payment is being processed in a separate tab:

- **Waiting state**: Shows spinning payment icon and message
- **Success state**: Shows green checkmark, auto-redirects after 2 seconds
- **Failed state**: Shows red X, allows user to close and try again
- **Closed state**: Shows warning when payment window was closed without completing

The modal uses polling (every 2 seconds) to check payment status without requiring page refresh.

**Window Close Handling**: When the payment window is closed, the modal continues polling for up to 10 more seconds (5 retries) to catch delayed payment confirmations. This handles cases where BOG's callback hasn't been processed yet when the user closes the window.

### 2. Order Items as Links

Each order item is clickable and navigates to the product page, allowing users to easily repurchase or view the product again.

```tsx
<Link href={`/store/${subdomain}/${locale}/products/${item.productId}`}>
  {/* Order item content */}
</Link>
```

### 3. Compact Status Timeline

A compact inline timeline in the order header visualizes the order's progression through different statuses using small dots:

- **Pending** → **Paid** → **Processing** → **Shipped** → **Delivered**

The current status is shown with the store's accent color and a ring indicator. Completed steps show green dots.

For cancelled or refunded orders, a simple badge with an icon is shown instead.

**Component**: `CompactTimeline`

```tsx
<CompactTimeline currentStatus={order.status} />
```

### 4. Localized Date Formatting

Dates are displayed in the user's locale:

- **Georgian (ka)**: "10 იანვარი, 2026"
- **English (en)**: "January 10, 2026"

**Function**: `formatDateLocalized(dateString, locale)`

Georgian month names are defined locally since `toLocaleDateString` may not fully support Georgian:

```typescript
const georgianMonths = [
  'იანვარი',
  'თებერვალი',
  'მარტი',
  'აპრილი',
  'მაისი',
  'ივნისი',
  'ივლისი',
  'აგვისტო',
  'სექტემბერი',
  'ოქტომბერი',
  'ნოემბერი',
  'დეკემბერი',
];
```

### 5. Expandable Order Footer

The order footer includes an expandable section that shows shipping details and price breakdown **side by side** on desktop (stacked on mobile):

- **Shipping Details** (left): Full address, city, postal code, country, phone number
- **Price Breakdown** (right): Subtotal, shipping cost, total

**Component**: `OrderFooter`

The footer is collapsed by default to keep the UI clean. Uses a responsive 2-column grid layout (`grid-cols-1 md:grid-cols-2`).

## Order Interface

```typescript
interface Order {
  _id: string;
  orderItems: OrderItem[];
  itemsPrice: number; // Sum of item prices
  shippingPrice: number; // Delivery cost
  totalPrice: number; // itemsPrice + shippingPrice
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

| Status       | Description                     | Color  |
| ------------ | ------------------------------- | ------ |
| `pending`    | Order created, awaiting payment | Yellow |
| `paid`       | Payment successful              | Blue   |
| `processing` | Seller is preparing the order   | Purple |
| `shipped`    | Order shipped by courier        | Indigo |
| `delivered`  | Order delivered to customer     | Green  |
| `cancelled`  | Order cancelled                 | Red    |
| `refunded`   | Order refunded                  | Gray   |

## Status Transition Rules (Seller Actions)

Sellers can only change order statuses according to these rules:

| Current Status | Allowed Transitions              | Restrictions                 |
| -------------- | -------------------------------- | ---------------------------- |
| `pending`      | None                             | Must wait for payment system |
| `paid`         | → processing, shipped, delivered | Cannot go back to pending    |
| `processing`   | → paid, shipped, delivered       | Normal workflow              |
| `shipped`      | → processing, delivered          | Can correct mistakes         |
| `delivered`    | → shipped                        | Only to fix errors           |
| `cancelled`    | None                             | Permanently locked           |
| `refunded`     | None                             | Permanently locked           |

### Validation Rules

1. **Cancelled/Refunded orders**: No status changes allowed
2. **Pending orders**: Cannot be manually updated (payment system only)
3. **Cannot set to PENDING**: Once paid, never goes back to pending
4. **Cannot manually set PAID**: Only payment callbacks can mark as paid
5. **Cannot manually set CANCELLED/REFUNDED**: Must use dedicated endpoints

### API Endpoint

```
PATCH /api/v1/orders/:id/status
Body: { "status": "processing" | "shipped" | "delivered" }
Auth: Seller or Admin role required
```

### Error Responses

- `400 Bad Request`: "Cannot change status of a cancelled order."
- `400 Bad Request`: "Cannot manually change status of a pending order."
- `400 Bad Request`: "Cannot set order status back to pending."

## Translations

Translation keys for orders feature:

| Key                                 | English                                    | Georgian                                   |
| ----------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `orders.viewDetails`                | View Details                               | დეტალების ნახვა                            |
| `orders.shippingDetails`            | Shipping Details                           | მიტანის დეტალები                           |
| `orders.priceBreakdown`             | Price Breakdown                            | ფასის დეტალები                             |
| `orders.subtotal`                   | Subtotal                                   | პროდუქტების ფასი                           |
| `orders.shipping`                   | Shipping                                   | მიტანა                                     |
| `orders.free`                       | Free                                       | უფასო                                      |
| `orders.payNow`                     | Pay Now                                    | გადახდა                                    |
| `orders.processing`                 | Processing...                              | მუშავდება...                               |
| `orders.awaitingPayment`            | Waiting for Payment                        | გადახდის მოლოდინი                          |
| `orders.awaitingPaymentDescription` | Complete your payment in the new window... | დაასრულეთ გადახდა ახალ ფანჯარაში...        |
| `orders.paymentWindowOpen`          | Payment window is open in another tab      | გადახდის ფანჯარა ღიაა სხვა ტაბში           |
| `orders.paymentSuccessful`          | Payment Successful!                        | გადახდა წარმატებულია!                      |
| `orders.paymentFailed`              | Payment Failed                             | გადახდა ვერ მოხერხდა                       |
| `orders.close`                      | Close                                      | დახურვა                                    |
| `orders.showCancelledOrders`        | Show cancelled orders                      | გაუქმებული შეკვეთების ჩვენება              |
| `orders.onlyCancelledOrders`        | You only have cancelled orders...          | თქვენ მხოლოდ გაუქმებული შეკვეთები გაქვთ... |

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
