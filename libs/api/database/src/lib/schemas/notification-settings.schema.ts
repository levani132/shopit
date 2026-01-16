import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

export type NotificationSettingsDocument =
  HydratedDocument<NotificationSettings>;

/**
 * Notification preference level
 * - OFF: No notifications
 * - IMPORTANT: Only important notifications (user-related, critical)
 * - ALL: All notifications including promotional
 */
export enum NotificationPreference {
  OFF = 'off',
  IMPORTANT = 'important',
  ALL = 'all',
}

@Schema({ timestamps: true, collection: 'notification_settings' })
export class NotificationSettings {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  })
  userId!: MongooseSchema.Types.ObjectId;

  /**
   * In-app (dashboard) notifications
   * Default: ALL - show all notifications in dashboard
   */
  @Prop({
    type: String,
    enum: NotificationPreference,
    default: NotificationPreference.ALL,
  })
  inApp!: NotificationPreference;

  /**
   * Email notifications
   * Default: OFF - user must opt-in for email notifications
   */
  @Prop({
    type: String,
    enum: NotificationPreference,
    default: NotificationPreference.OFF,
  })
  email!: NotificationPreference;

  /**
   * Push notifications
   * Default: IMPORTANT - only important notifications
   */
  @Prop({
    type: String,
    enum: NotificationPreference,
    default: NotificationPreference.IMPORTANT,
  })
  push!: NotificationPreference;

  /**
   * Push notification subscription data
   * Stored when user subscribes to push notifications
   */
  @Prop({ type: Object })
  pushSubscription?: {
    endpoint: string;
    keys: {
      p256dh: string;
      auth: string;
    };
  };
}

export const NotificationSettingsSchema =
  SchemaFactory.createForClass(NotificationSettings);
