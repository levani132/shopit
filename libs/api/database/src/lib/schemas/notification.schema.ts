import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

/**
 * Notification Types
 * - IMPORTANT: Critical user-related notifications (courier approval, order updates, etc.)
 * - PROMO: Marketing and promotional notifications
 */
export enum NotificationType {
  IMPORTANT = 'important',
  PROMO = 'promo',
}

/**
 * Notification Categories for specific use cases
 */
export enum NotificationCategory {
  // Courier related
  COURIER_APPROVED = 'courier_approved',
  COURIER_REJECTED = 'courier_rejected',

  // Order related (future)
  ORDER_PLACED = 'order_placed',
  ORDER_SHIPPED = 'order_shipped',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',

  // Store related (future)
  STORE_APPROVED = 'store_approved',
  STORE_REJECTED = 'store_rejected',

  // Promotional (future)
  NEW_FEATURE = 'new_feature',
  SALE = 'sale',
  NEWSLETTER = 'newsletter',

  // System
  SYSTEM = 'system',
}

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  @Prop({ required: true, trim: true })
  title!: string;

  @Prop({ required: true, trim: true })
  message!: string;

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.IMPORTANT,
  })
  type!: NotificationType;

  @Prop({ type: String, enum: NotificationCategory, required: true })
  category!: NotificationCategory;

  @Prop({ default: false, index: true })
  isRead!: boolean;

  @Prop()
  link?: string; // Optional link to navigate to when clicked

  @Prop({ type: Object })
  metadata?: Record<string, unknown>; // Additional data for the notification

  // Localized content support
  @Prop({ type: Object })
  titleLocalized?: {
    en?: string;
    ka?: string;
  };

  @Prop({ type: Object })
  messageLocalized?: {
    en?: string;
    ka?: string;
  };
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Index for efficient querying
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
