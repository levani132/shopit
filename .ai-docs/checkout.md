# Checkout System

## Overview

The checkout system provides a complete e-commerce flow including:
- Guest checkout (without registration)
- Authenticated user checkout
- Address management
- Stock reservation and rollback
- Bank of Georgia (BOG) payment integration
- Order status tracking

## Checkout Flow

### Step 1: Authentication/Guest Choice
- **Authenticated users**: Proceed directly to shipping
- **Guest users**: Fill in contact information (name, email, phone)
- Option to login during checkout

### Step 2: Shipping Address
- **Authenticated users**: Select from saved addresses or add new
- **Guest users**: Enter shipping address
- Addresses can be saved for future use
- Default address auto-selection

### Step 3: Review & Pay
- Order summary with all items
- Shipping address confirmation
- Payment method selection (currently BOG)
- Final total calculation

### Step 4: Payment
- Redirect to BOG payment page
- Automatic stock reservation (10-minute timeout)
- Order status updates via webhook

## Backend Architecture

### Order Schema (`libs/api/database/src/lib/schemas/order.schema.ts`)

```typescript
interface Order {
  _id: ObjectId;
  user?: ObjectId;              // Optional for guest orders
  guestInfo?: {
    email: string;
    phoneNumber: string;
    fullName: string;
  };
  isGuestOrder: boolean;
  orderItems: OrderItem[];
  shippingDetails: ShippingDetails;
  paymentMethod: string;
  paymentResult?: PaymentResult;
  itemsPrice: number;
  shippingPrice: number;
  taxPrice: number;
  totalPrice: number;
  isPaid: boolean;
  paidAt?: Date;
  isDelivered: boolean;
  deliveredAt?: Date;
  status: OrderStatus;
  externalOrderId?: string;     // BOG transaction ID
  stockReservationExpires?: Date;
}

enum OrderStatus {
  PENDING = 'pending',           // Awaiting payment
  PAID = 'paid',                 // Payment successful
  PROCESSING = 'processing',     // Seller preparing order
  READY_FOR_DELIVERY = 'ready_for_delivery', // Ready for courier pickup
  SHIPPED = 'shipped',           // Courier has the order
  DELIVERED = 'delivered',       // Customer received order
  CANCELLED = 'cancelled',       // Order cancelled
  REFUNDED = 'refunded',         // Order refunded
}
```

### Order Status Flow

```
PENDING → PAID → PROCESSING → READY_FOR_DELIVERY → SHIPPED → DELIVERED
                                                           ↘ CANCELLED
                                                           ↘ REFUNDED
```

### Who Can Change Status

| Actor | Endpoint | Allowed Statuses |
|-------|----------|------------------|
| **Payment System** | `markAsPaid()` | `PENDING → PAID` |
| **Seller (self-delivery)** | `PATCH /orders/:id/status` | `PAID → PROCESSING → SHIPPED → DELIVERED` |
| **Seller (ShopIt delivery)** | `PATCH /orders/:id/status` | `PAID → PROCESSING → READY_FOR_DELIVERY` |
| **Courier** | `PATCH /orders/:id/courier-status` | `READY_FOR_DELIVERY → SHIPPED → DELIVERED` |
| **Admin** | `PATCH /admin/orders/:id/status` | Any status |

### Important Notes on Status Fields

- `status` is the **source of truth** for order state
- `isPaid` boolean syncs with status (true when status != pending)
- `isDelivered` boolean syncs with status (true only when status == delivered)
- Always use `status` field for logic, not the boolean flags
- Admin controller automatically syncs boolean flags and processes earnings

### Stock Reservation System

Located in `apps/api/src/orders/stock-reservation.service.ts`:

1. **On Order Creation**:
   - Atomic stock decrement using MongoDB transactions
   - Sets `stockReservationExpires` to 10 minutes from creation

2. **Cron Job** (every minute):
   - Finds orders where:
     - `status = 'pending'`
     - `isPaid = false`
     - `stockReservationExpires < now`
   - Restores stock for each expired reservation
   - Marks order as cancelled

3. **On Payment Success**:
   - Clears `stockReservationExpires`
   - Updates order status to 'paid'

4. **On Payment Failure**:
   - Restores stock immediately
   - Marks order as cancelled

## BOG Payment Integration

### Environment Variables

```env
# Bank of Georgia Payment Gateway
BOG_CLIENT_ID=your_client_id
BOG_CLIENT_SECRET=your_client_secret
BOG_CALLBACK_URL=https://yourdomain.com/api/v1/payments/callback
```

### Payment Flow

1. **Token Generation** (`PaymentsService.getToken()`)
   - OAuth2 client credentials flow
   - Returns access token for API calls

2. **Payment Creation** (`PaymentsService.createPayment()`)
   - Creates payment order on BOG
   - Returns redirect URL for customer

3. **Callback Handling** (`PaymentsService.handlePaymentCallback()`)
   - Validates signature
   - Updates order status
   - Credits seller balance if successful

### API Endpoints

```
POST /api/v1/payments/initiate
  - Body: { orderId, totalPrice, items, customer, successUrl, failUrl }
  - Returns: { redirectUrl }

POST /api/v1/payments/callback
  - BOG webhook endpoint
  - Handles payment status updates
```

## User Addresses

### Schema (in `user.schema.ts`)

```typescript
interface ShippingAddress {
  _id: ObjectId;
  label?: string;        // e.g., "Home", "Work"
  address: string;
  city: string;
  postalCode?: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}
```

### API Endpoints

```
GET    /api/v1/auth/addresses        - List user addresses
POST   /api/v1/auth/addresses        - Add new address
PATCH  /api/v1/auth/addresses/:id    - Update address
DELETE /api/v1/auth/addresses/:id    - Delete address
```

## Seller Balance System

### Balance Transaction Schema

```typescript
interface BalanceTransaction {
  sellerId: ObjectId;                // Also used for couriers (both are users)
  orderId?: ObjectId;
  storeId?: ObjectId;
  amount: number;                    // Positive for earnings, negative for withdrawals
  type: TransactionType;
  description: string;
  commissionPercentage?: number;     // Site fee (10%)
  commissionAmount?: number;
  deliveryCommissionAmount?: number;
  productPrice?: number;
  finalAmount?: number;
  bankAccountNumber?: string;        // For withdrawals
}

enum TransactionType {
  EARNING = 'earning',
  WITHDRAWAL_PENDING = 'withdrawal_pending',
  WITHDRAWAL_COMPLETED = 'withdrawal_completed',
  WITHDRAWAL_REJECTED = 'withdrawal_rejected',
  WITHDRAWAL_FAILED = 'withdrawal_failed',
  COMMISSION_DEDUCTION = 'commission_deduction',
  REFUND = 'refund',
}
```

### Seller Balance Fields (in User model)

```typescript
// User model fields (same for sellers and couriers)
interface UserBalanceFields {
  balance: number;              // Current available balance
  totalEarnings: number;        // All-time earnings (from delivered orders)
  pendingWithdrawals: number;   // Amount being withdrawn
  totalWithdrawn: number;       // All-time withdrawals
}

// API response (GET /api/v1/balance)
interface SellerBalanceResponse {
  availableBalance: number;     // Can withdraw now
  waitingEarnings: number;      // From paid but not delivered orders
  pendingBalance: number;       // Withdrawal in progress
  totalEarnings: number;        // All-time earnings
  totalWithdrawn: number;       // All-time withdrawals
}
```

### Waiting Earnings

Waiting earnings represent money from orders that are:
- `isPaid: true` (payment received)
- Status in: `paid`, `processing`, `ready_for_delivery`, `shipped`

**IMPORTANT**: We use status-based filtering, NOT the `isDelivered` flag.
The `isDelivered` boolean is a legacy/redundant field that can get out of sync.
The `status` field is the source of truth for order state.

This amount will be added to `availableBalance` once orders are delivered.

Calculated by `BalanceService.calculateWaitingEarnings()`:
1. Find all orders for seller's store(s) with `isPaid=true` and status NOT `delivered/cancelled/refunded`
2. Calculate expected earnings after commissions
3. Return total waiting amount

### Commission Structure

- **Site Fee**: 10% of order total (configurable in site settings)
- **Delivery Commission**: Deducted from seller if using ShopIt courier (min/max configurable)
- **Seller Receives**: `orderTotal - siteFee - deliveryCommission`
- **Courier Receives**: The `shippingPrice` paid by customer

### Earnings Flow

1. Order is delivered (status = 'delivered')
2. `BalanceService.processOrderEarnings()` is called
3. For each store in the order:
   - Calculates seller's share after commissions
   - Creates `EARNING` transaction for seller
   - Updates seller's `balance` and `totalEarnings`
4. If order has a courier assigned (`courierId`):
   - `processCourierEarnings()` is called
   - Courier receives the `shippingPrice`
   - Creates `EARNING` transaction for courier
   - Updates courier's `balance` and `totalEarnings`

### Withdrawal Flow

1. Seller requests withdrawal
2. Creates `WITHDRAWAL_PENDING` transaction
3. Deducts from `balance`
4. Adds to `pendingWithdrawals`
5. Admin approves → `WITHDRAWAL_COMPLETED`
6. `pendingWithdrawals` → `totalWithdrawn`
7. Money transferred via bank

## Courier Balance System

Couriers use the same balance fields as sellers in the User model.

### When Courier Balance Changes

| Event | Effect |
|-------|--------|
| Order delivered | `balance += shippingPrice`, `totalEarnings += shippingPrice` |
| Withdrawal requested | `balance -= amount`, `pendingWithdrawals += amount` |
| Withdrawal completed | `pendingWithdrawals -= amount`, `totalWithdrawn += amount` |

### Important Notes

- Couriers only earn from orders where they are the assigned courier (`order.courierId`)
- Courier earnings = `order.shippingPrice` (what customer paid for delivery)
- Self-delivery orders (where store uses `courierType: 'seller'`) have no courier

## Frontend Components

### Checkout Page (`apps/web/src/app/store/[subdomain]/[locale]/checkout/page.tsx`)

- Multi-step checkout form
- Guest/auth detection
- Address selection/creation
- Order summary sidebar
- Payment initiation

### Cart Page (`apps/web/src/app/store/[subdomain]/[locale]/cart/page.tsx`)

- List cart items
- Quantity adjustments
- Remove items
- Subtotal calculation
- Checkout button

### Order History (`apps/web/src/app/store/[subdomain]/[locale]/orders/page.tsx`)

- List user's past orders
- Order status badges
- Order details view

### Dashboard Orders (`apps/web/src/app/[locale]/dashboard/orders/page.tsx`)

- Seller's incoming orders
- Status filtering
- Order details panel
- Status update buttons

### Dashboard Balance (`apps/web/src/app/[locale]/dashboard/balance/page.tsx`)

- Balance overview cards
- Withdrawal form
- Transaction history

## Context Providers

### CheckoutContext (`apps/web/src/contexts/CheckoutContext.tsx`)

```typescript
interface CheckoutContextType {
  shippingAddress: ShippingAddress | null;
  setShippingAddress: (address: ShippingAddress | null) => void;
  guestInfo: GuestInfo | null;
  setGuestInfo: (info: GuestInfo | null) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  clearCheckout: () => void;
}
```

### CartContext (`apps/web/src/contexts/CartContext.tsx`)

```typescript
interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (item, quantity?) => void;
  removeItem: (productId, variantId?) => void;
  updateQuantity: (productId, variantId, quantity) => void;
  clearCart: () => void;
  clearStoreCart: (storeId) => void;
  getItemQuantity: (productId, variantId?) => number;
  isInCart: (productId, variantId?) => boolean;
  getStoreItems: (storeId) => CartItem[];
}
```

## Store Delivery Settings

### Schema (in `store.schema.ts`)

```typescript
interface StoreDeliverySettings {
  courierPreference: 'shopit' | 'seller';
  ownCourierShippingCost: number;    // If seller delivers
  minPreparationDays: number;         // Item prep time
  maxPreparationDays: number;
}
```

### Shipping Cost Calculation

- **ShopIt Courier**: Fixed rate based on location
- **Seller Courier**: `ownCourierShippingCost` added per order

### Delivery Time Estimation

```
Total Time = Preparation Days + Courier Transit Days
```

## Translations

All checkout-related translations are in:
- `apps/web/src/messages/ka.json` → `checkout`, `orders`, `balance` sections
- `apps/web/src/messages/en.json` → `checkout`, `orders`, `balance` sections

## Testing Checkout

1. Add items to cart
2. Navigate to `/checkout`
3. Choose guest or login
4. Enter/select shipping address
5. Review and click "Pay Now"
6. Complete payment on BOG page
7. Return to success/fail page

## Error Handling

- **Stock unavailable**: Shows error, prevents checkout
- **Payment failed**: Redirects to fail page, stock released
- **Session expired**: Stock released via cron job
- **Network errors**: Displayed in UI with retry option

