# Notifications System

This document describes the notifications system implemented in ShopIt.

## Overview

The notifications system provides a way to inform users about important events and promotional content. It supports three delivery channels:

1. **In-App Notifications** - Displayed in the dashboard
2. **Email Notifications** - Sent to user's email (TODO)
3. **Push Notifications** - Browser push notifications (TODO)

## Notification Types

### Important Notifications

Critical user-related notifications that require attention:

- Courier application approved
- Courier application rejected
- Order status changes (future)
- Account security alerts (future)

### Promotional Notifications

Marketing and promotional content:

- New features
- Special offers
- Newsletters (future)

## Database Schemas

### Notification Schema

Located in `libs/api/database/src/lib/schemas/notification.schema.ts`

| Field            | Type                   | Description                                  |
| ---------------- | ---------------------- | -------------------------------------------- |
| userId           | ObjectId               | Reference to the user                        |
| title            | string                 | Notification title                           |
| message          | string                 | Notification message                         |
| type             | 'important' \| 'promo' | Notification type                            |
| category         | string                 | Specific category (e.g., 'courier_approved') |
| isRead           | boolean                | Read status                                  |
| link             | string?                | Optional navigation link                     |
| metadata         | object?                | Additional data                              |
| titleLocalized   | object?                | Localized titles (en, ka)                    |
| messageLocalized | object?                | Localized messages (en, ka)                  |

### NotificationSettings Schema

Located in `libs/api/database/src/lib/schemas/notification-settings.schema.ts`

| Field            | Type                          | Default     | Description                    |
| ---------------- | ----------------------------- | ----------- | ------------------------------ |
| userId           | ObjectId                      | -           | Reference to the user          |
| inApp            | 'off' \| 'important' \| 'all' | 'all'       | In-app notification preference |
| email            | 'off' \| 'important' \| 'all' | 'off'       | Email notification preference  |
| push             | 'off' \| 'important' \| 'all' | 'important' | Push notification preference   |
| pushSubscription | object?                       | -           | Web push subscription data     |

## API Endpoints

### Notifications

| Method | Endpoint                             | Description            |
| ------ | ------------------------------------ | ---------------------- |
| GET    | `/api/v1/notifications`              | Get user notifications |
| GET    | `/api/v1/notifications/unread-count` | Get unread count       |
| PATCH  | `/api/v1/notifications/:id/read`     | Mark as read           |
| PATCH  | `/api/v1/notifications/read-all`     | Mark all as read       |
| DELETE | `/api/v1/notifications/:id`          | Delete notification    |

### Notification Settings

| Method | Endpoint                                           | Description              |
| ------ | -------------------------------------------------- | ------------------------ |
| GET    | `/api/v1/notifications/settings`                   | Get settings             |
| PATCH  | `/api/v1/notifications/settings`                   | Update settings          |
| POST   | `/api/v1/notifications/settings/push-subscription` | Save push subscription   |
| DELETE | `/api/v1/notifications/settings/push-subscription` | Remove push subscription |

## Query Parameters (GET /notifications)

| Parameter  | Type                   | Default | Description              |
| ---------- | ---------------------- | ------- | ------------------------ |
| page       | number                 | 1       | Page number              |
| limit      | number                 | 20      | Items per page (max 100) |
| unreadOnly | boolean                | false   | Filter unread only       |
| type       | 'important' \| 'promo' | -       | Filter by type           |

## Frontend Pages

### Notifications List

`/dashboard/notifications`

- Lists all notifications
- Filter by all/unread
- Mark as read
- Delete notifications
- Pagination

### Notification Settings

`/dashboard/notifications/settings`

- Configure in-app, email, and push preferences
- Three options per channel: Off, Important Only, All

## Sending Notifications

To send a notification from the API:

```typescript
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType, NotificationCategory } from '@shopit/api-database';

// Inject the service
constructor(private readonly notificationsService: NotificationsService) {}

// Send a notification
await this.notificationsService.createNotification({
  userId: user._id.toString(),
  title: 'Notification Title',
  message: 'Notification message body',
  type: NotificationType.IMPORTANT, // or NotificationType.PROMO
  category: NotificationCategory.COURIER_APPROVED,
  link: '/dashboard/deliveries', // optional
  titleLocalized: {
    en: 'English title',
    ka: 'Georgian title',
  },
  messageLocalized: {
    en: 'English message',
    ka: 'Georgian message',
  },
});
```

## Available Categories

- `COURIER_APPROVED` - Courier application approved
- `COURIER_REJECTED` - Courier application rejected
- `ORDER_PLACED` - New order placed (future)
- `ORDER_SHIPPED` - Order shipped (future)
- `ORDER_DELIVERED` - Order delivered (future)
- `ORDER_CANCELLED` - Order cancelled (future)
- `STORE_APPROVED` - Store approved (future)
- `STORE_REJECTED` - Store rejected (future)
- `NEW_FEATURE` - New feature announcement (future)
- `SALE` - Sale/discount promotion (future)
- `NEWSLETTER` - Newsletter (future)
- `SYSTEM` - System notification

## TODO: Email Notifications

Email notifications are not yet implemented. When implementing:

1. Set up an email service (e.g., SendGrid, AWS SES, Nodemailer)
2. Create email templates for each notification category
3. Update `NotificationsService.handleEmailNotification()` method
4. Handle email verification and unsubscribe links

## TODO: Push Notifications

Push notifications are not yet implemented. When implementing:

1. Set up web-push library
2. Generate VAPID keys
3. Create a service worker for the frontend
4. Update `NotificationsService.handlePushNotification()` method
5. Handle push subscription management in the frontend

### Required Environment Variables (future)

```env
# Web Push
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
VAPID_SUBJECT=mailto:contact@shopit.ge

# Email Service (example for SendGrid)
SENDGRID_API_KEY=your_api_key
EMAIL_FROM=noreply@shopit.ge
```

## User Experience

### Notification Settings Defaults

- **In-App**: All (show all notifications in dashboard)
- **Email**: Off (user must opt-in)
- **Push**: Important only (balance between utility and annoyance)

### Preference Levels

- **Off**: No notifications for this channel
- **Important**: Only critical notifications (account, orders, etc.)
- **All**: All notifications including promotional content
