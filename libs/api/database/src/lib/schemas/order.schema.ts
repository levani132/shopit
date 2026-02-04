import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

// Order statuses
export enum OrderStatus {
  PENDING = 'pending', // Order created, awaiting payment
  PAID = 'paid', // Payment successful
  PROCESSING = 'processing', // Seller is preparing the order
  READY_FOR_DELIVERY = 'ready_for_delivery', // Ready for ShopIt courier pickup (shown as "Processing" to customers)
  SHIPPED = 'shipped', // Order shipped by courier
  DELIVERED = 'delivered', // Order delivered to customer
  CANCELLED = 'cancelled', // Order cancelled
  REFUNDED = 'refunded', // Order refunded
}

// Guest checkout information
@Schema({ _id: false })
export class GuestInfo {
  @Prop({ required: true })
  email!: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop({ required: true })
  fullName!: string;
}

export const GuestInfoSchema = SchemaFactory.createForClass(GuestInfo);

// Shipping details for the order
@Schema({ _id: false })
export class OrderShippingDetails {
  @Prop({ required: true })
  address!: string;

  @Prop({ required: true })
  city!: string;

  @Prop()
  postalCode?: string;

  @Prop({ required: true, default: 'Georgia' })
  country!: string;

  @Prop()
  phoneNumber?: string;
}

export const OrderShippingDetailsSchema =
  SchemaFactory.createForClass(OrderShippingDetails);

// Payment result from BOG
@Schema({ _id: false })
export class PaymentResult {
  @Prop({ required: true })
  id!: string; // BOG order ID

  @Prop({ required: true })
  status!: string;

  @Prop({ required: true })
  updateTime!: string;

  @Prop()
  emailAddress?: string;
}

export const PaymentResultSchema = SchemaFactory.createForClass(PaymentResult);

// Variant attribute info stored on order item (denormalized)
@Schema({ _id: false })
export class OrderItemVariantAttribute {
  @Prop({ required: true })
  attributeName!: string;

  @Prop({ required: true })
  value!: string;

  @Prop()
  colorHex?: string;
}

export const OrderItemVariantAttributeSchema = SchemaFactory.createForClass(
  OrderItemVariantAttribute,
);

// Individual order item
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: Types.ObjectId, ref: 'Product', required: true })
  productId!: Types.ObjectId;

  @Prop({ required: true })
  name!: string; // Denormalized

  @Prop()
  nameEn?: string; // English name

  @Prop({ required: true })
  image!: string; // Product image URL

  @Prop({ required: true, min: 0 })
  price!: number; // Price at time of purchase

  @Prop({ required: true, min: 1 })
  qty!: number;

  // Variant information (if applicable)
  @Prop({ type: Types.ObjectId })
  variantId?: Types.ObjectId;

  @Prop({ type: [OrderItemVariantAttributeSchema], default: [] })
  variantAttributes!: OrderItemVariantAttribute[];

  // Store information for multi-store orders
  @Prop({ type: Types.ObjectId, ref: 'Store', required: true })
  storeId!: Types.ObjectId;

  @Prop({ required: true })
  storeName!: string; // Denormalized

  @Prop()
  storeSubdomain?: string; // Denormalized for product links

  // Delivery info (denormalized from store at time of order)
  @Prop()
  courierType?: string; // 'shopit' or 'seller'

  @Prop()
  prepTimeMinDays?: number;

  @Prop()
  prepTimeMaxDays?: number;

  @Prop()
  deliveryMinDays?: number;

  @Prop()
  deliveryMaxDays?: number;

  @Prop({
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
    required: true,
  })
  shippingSize!: 'small' | 'medium' | 'large' | 'extra_large';
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

@Schema({ timestamps: true, collection: 'orders' })
export class Order {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId; // Optional for guest checkout

  // Guest checkout information
  @Prop({ type: GuestInfoSchema })
  guestInfo?: GuestInfo;

  @Prop({ default: false })
  isGuestOrder!: boolean;

  @Prop({ type: [OrderItemSchema], required: true })
  orderItems!: OrderItem[];

  @Prop({ type: OrderShippingDetailsSchema, required: true })
  shippingDetails!: OrderShippingDetails;

  // Pickup/Store address (denormalized from store for courier use)
  @Prop()
  pickupStoreName?: string;

  @Prop()
  pickupAddress?: string;

  @Prop()
  pickupCity?: string;

  @Prop()
  pickupPhoneNumber?: string;

  // Pickup location coordinates (from store)
  @Prop({ type: Object })
  pickupLocation?: {
    lat: number;
    lng: number;
  };

  // Delivery location coordinates (from user's shipping address)
  @Prop({ type: Object })
  deliveryLocation?: {
    lat: number;
    lng: number;
  };

  // Recipient name (denormalized for courier use)
  @Prop()
  recipientName?: string;

  @Prop({ required: true, default: 'BOG' })
  paymentMethod!: string;

  // Delivery method: 'delivery' (home delivery) or 'pickup' (self-pickup from store)
  @Prop({ type: String, enum: ['delivery', 'pickup'], default: 'delivery' })
  deliveryMethod!: 'delivery' | 'pickup';

  @Prop({ type: PaymentResultSchema })
  paymentResult?: PaymentResult;

  // Pricing
  @Prop({ required: true, default: 0, min: 0 })
  itemsPrice!: number; // Sum of item prices

  @Prop({ required: true, default: 0, min: 0 })
  shippingPrice!: number; // Delivery fee

  @Prop({ min: 0 })
  distanceKm?: number; // Distance between pickup and delivery in kilometers

  @Prop({ required: true, default: 0, min: 0 })
  taxPrice!: number; // Tax (if applicable)

  @Prop({ required: true, default: 0, min: 0 })
  totalPrice!: number; // Total order price

  // Status tracking
  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Prop()
  statusReason?: string; // Reason for cancellation, etc.

  @Prop({ default: false })
  isPaid!: boolean;

  @Prop()
  paidAt?: Date;

  @Prop({ default: false })
  isDelivered!: boolean;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  shippedAt?: Date;

  // Courier pickup timestamp (when courier picked up the order from store)
  @Prop()
  pickedUpAt?: Date;

  // Route tracking - which route was used for pickup/delivery
  @Prop({ type: Types.ObjectId, ref: 'CourierRoute' })
  pickedUpFromRouteId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CourierRoute' })
  deliveredFromRouteId?: Types.ObjectId;

  @Prop()
  cancelledAt?: Date;

  // Courier assignment (for ShopIt delivery)
  @Prop({ type: Types.ObjectId, ref: 'User' })
  courierId?: Types.ObjectId;

  @Prop()
  courierAssignedAt?: Date;

  // Estimated shipping size for this order (auto-calculated from largest item size)
  // Used as initial suggestion for vehicle type needed
  @Prop({
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
    default: 'small',
  })
  estimatedShippingSize?: 'small' | 'medium' | 'large' | 'extra_large';

  // Confirmed shipping size for this order (set by seller, can be different from estimated)
  // If not set, estimatedShippingSize is used
  // Used to filter orders for couriers based on their vehicle type
  @Prop({
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
  })
  confirmedShippingSize?: 'small' | 'medium' | 'large' | 'extra_large';

  // Effective shipping size (confirmed if set, otherwise estimated)
  // This is a virtual field computed at query time
  // For backward compatibility, we also keep 'shippingSize' as a field that stores the effective value
  @Prop({
    type: String,
    enum: ['small', 'medium', 'large', 'extra_large'],
    default: 'small',
  })
  shippingSize?: 'small' | 'medium' | 'large' | 'extra_large';

  // Delivery deadline (calculated from paidAt + prep time + delivery estimate)
  @Prop()
  deliveryDeadline?: Date;

  // BOG integration
  @Prop({ unique: true, sparse: true })
  externalOrderId?: string; // UUID sent to BOG

  // Stock reservation expiration (10 minutes from order creation)
  @Prop({
    type: Date,
    default: () => new Date(Date.now() + 10 * 60 * 1000),
  })
  stockReservationExpires?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// Indexes
OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ 'orderItems.storeId': 1, createdAt: -1 }); // Find orders for a store
OrderSchema.index({ status: 1, createdAt: -1 });
OrderSchema.index({ externalOrderId: 1 });
OrderSchema.index({ isPaid: 1, stockReservationExpires: 1 }); // For stock release cron
OrderSchema.index({ 'guestInfo.email': 1 }); // Find guest orders by email
OrderSchema.index({ courierId: 1, status: 1 }); // For courier's assigned orders
OrderSchema.index({ status: 1, shippingSize: 1, courierId: 1 }); // For filtering available orders by shipping size
