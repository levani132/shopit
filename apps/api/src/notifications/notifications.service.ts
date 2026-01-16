import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
  NotificationType,
  NotificationCategory,
  NotificationSettings,
  NotificationSettingsDocument,
  NotificationPreference,
} from '@sellit/api-database';
import { GetNotificationsDto, UpdateNotificationSettingsDto } from './dto';

export interface CreateNotificationData {
  userId: string | Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  link?: string;
  metadata?: Record<string, unknown>;
  titleLocalized?: { en?: string; ka?: string };
  messageLocalized?: { en?: string; ka?: string };
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(NotificationSettings.name)
    private notificationSettingsModel: Model<NotificationSettingsDocument>,
  ) {}

  /**
   * Create a new notification
   * Respects user's notification settings
   */
  async createNotification(data: CreateNotificationData): Promise<NotificationDocument | null> {
    const settings = await this.getOrCreateSettings(data.userId.toString());

    // Check if user wants to receive this type of notification in-app
    const shouldShowInApp = this.shouldShowNotification(settings.inApp, data.type);

    if (!shouldShowInApp) {
      this.logger.debug(`Notification filtered out by user settings for user ${data.userId}`);
      return null;
    }

    const notification = new this.notificationModel({
      userId: new Types.ObjectId(data.userId.toString()),
      title: data.title,
      message: data.message,
      type: data.type,
      category: data.category,
      link: data.link,
      metadata: data.metadata,
      titleLocalized: data.titleLocalized,
      messageLocalized: data.messageLocalized,
    });

    await notification.save();
    this.logger.log(`Notification created for user ${data.userId}: ${data.category}`);

    // TODO: Send email notification if enabled
    // TODO: Send push notification if enabled
    await this.handleEmailNotification(data, settings);
    await this.handlePushNotification(data, settings);

    return notification;
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(userId: string, query: GetNotificationsDto) {
    const { page = 1, limit = 20, unreadOnly, type } = query;
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      userId: new Types.ObjectId(userId),
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    if (type) {
      filter.type = type;
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
    ]);

    const unreadCount = await this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });

    return {
      notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      userId: new Types.ObjectId(userId),
      isRead: false,
    });
  }

  /**
   * Mark a notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationModel.updateOne(
      {
        _id: new Types.ObjectId(notificationId),
        userId: new Types.ObjectId(userId),
      },
      { $set: { isRead: true } },
    );
    return result.modifiedCount > 0;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        isRead: false,
      },
      { $set: { isRead: true } },
    );
    return result.modifiedCount;
  }

  /**
   * Delete a notification
   */
  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: new Types.ObjectId(notificationId),
      userId: new Types.ObjectId(userId),
    });
    return result.deletedCount > 0;
  }

  /**
   * Get notification settings for a user
   */
  async getSettings(userId: string): Promise<NotificationSettingsDocument> {
    return this.getOrCreateSettings(userId);
  }

  /**
   * Update notification settings
   */
  async updateSettings(
    userId: string,
    updates: UpdateNotificationSettingsDto,
  ): Promise<NotificationSettingsDocument> {
    const settings = await this.getOrCreateSettings(userId);

    if (updates.inApp !== undefined) {
      settings.inApp = updates.inApp;
    }
    if (updates.email !== undefined) {
      settings.email = updates.email;
    }
    if (updates.push !== undefined) {
      settings.push = updates.push;
    }

    await settings.save();
    this.logger.log(`Notification settings updated for user ${userId}`);

    return settings;
  }

  /**
   * Save push subscription
   */
  async savePushSubscription(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  ): Promise<void> {
    const settings = await this.getOrCreateSettings(userId);
    settings.pushSubscription = subscription;
    await settings.save();
    this.logger.log(`Push subscription saved for user ${userId}`);
  }

  /**
   * Remove push subscription
   */
  async removePushSubscription(userId: string): Promise<void> {
    await this.notificationSettingsModel.updateOne(
      { userId: new Types.ObjectId(userId) },
      { $unset: { pushSubscription: 1 } },
    );
    this.logger.log(`Push subscription removed for user ${userId}`);
  }

  // ========== Private Methods ==========

  private async getOrCreateSettings(userId: string): Promise<NotificationSettingsDocument> {
    let settings = await this.notificationSettingsModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!settings) {
      settings = new this.notificationSettingsModel({
        userId: new Types.ObjectId(userId),
        inApp: NotificationPreference.ALL,
        email: NotificationPreference.OFF,
        push: NotificationPreference.IMPORTANT,
      });
      await settings.save();
    }

    return settings;
  }

  private shouldShowNotification(preference: NotificationPreference, type: NotificationType): boolean {
    switch (preference) {
      case NotificationPreference.OFF:
        return false;
      case NotificationPreference.IMPORTANT:
        return type === NotificationType.IMPORTANT;
      case NotificationPreference.ALL:
        return true;
      default:
        return false;
    }
  }

  /**
   * Handle email notification
   * TODO: Implement email sending via email service
   */
  private async handleEmailNotification(
    data: CreateNotificationData,
    settings: NotificationSettingsDocument,
  ): Promise<void> {
    const shouldSend = this.shouldShowNotification(settings.email, data.type);
    if (!shouldSend) return;

    // TODO: Implement email sending
    // This is a placeholder for future implementation
    this.logger.debug(`[TODO] Would send email notification to user ${data.userId}`);
  }

  /**
   * Handle push notification
   * TODO: Implement push notification via web-push
   */
  private async handlePushNotification(
    data: CreateNotificationData,
    settings: NotificationSettingsDocument,
  ): Promise<void> {
    const shouldSend = this.shouldShowNotification(settings.push, data.type);
    if (!shouldSend || !settings.pushSubscription) return;

    // TODO: Implement push notification sending
    // This is a placeholder for future implementation
    this.logger.debug(`[TODO] Would send push notification to user ${data.userId}`);
  }
}
