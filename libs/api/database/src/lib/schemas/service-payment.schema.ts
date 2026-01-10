import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ServicePaymentDocument = HydratedDocument<ServicePayment>;

/**
 * Types of platform services that can be purchased
 */
export enum ServiceType {
  SUBDOMAIN_CHANGE = 'subdomain_change',
  // Future services can be added here
  // FEATURED_LISTING = 'featured_listing',
  // PREMIUM_THEME = 'premium_theme',
}

/**
 * Status of the service payment
 */
export enum ServicePaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

/**
 * Schema for tracking platform service payments
 * These are payments for ShopIt platform services, not product orders
 */
@Schema({ timestamps: true, collection: 'service_payments' })
export class ServicePayment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Store' })
  storeId?: Types.ObjectId;

  @Prop({ type: String, enum: ServiceType, required: true })
  serviceType!: ServiceType;

  @Prop({ required: true })
  amount!: number; // Amount in GEL

  @Prop({ type: String, enum: ServicePaymentStatus, default: ServicePaymentStatus.PENDING })
  status!: ServicePaymentStatus;

  @Prop()
  externalOrderId?: string; // BOG external order ID for payment tracking

  @Prop()
  bogOrderId?: string; // BOG order ID

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Service-specific data (e.g., new subdomain for subdomain change)

  @Prop({ type: Object })
  paymentResult?: {
    id: string;
    status: string;
    updateTime: string;
    emailAddress?: string;
  };

  @Prop()
  completedAt?: Date;

  @Prop()
  expiresAt?: Date; // When this pending payment expires
}

export const ServicePaymentSchema = SchemaFactory.createForClass(ServicePayment);

// Indexes
ServicePaymentSchema.index({ userId: 1 });
ServicePaymentSchema.index({ storeId: 1 });
ServicePaymentSchema.index({ externalOrderId: 1 });
ServicePaymentSchema.index({ status: 1 });
ServicePaymentSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index for expired pending payments

