import {
  Controller,
  Get,
  Patch,
  Delete,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import {
  GetNotificationsDto,
  UpdateNotificationSettingsDto,
  PushSubscriptionDto,
} from './dto';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
  })
  async getNotifications(
    @Request() req: { user: { userId: string } },
    @Query() query: GetNotificationsDto,
  ) {
    return this.notificationsService.getNotifications(req.user.userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@Request() req: { user: { userId: string } }) {
    const count = await this.notificationsService.getUnreadCount(
      req.user.userId,
    );
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @Request() req: { user: { userId: string } },
    @Param('id') notificationId: string,
  ) {
    const success = await this.notificationsService.markAsRead(
      req.user.userId,
      notificationId,
    );
    return { success };
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@Request() req: { user: { userId: string } }) {
    const count = await this.notificationsService.markAllAsRead(
      req.user.userId,
    );
    return { success: true, count };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  @ApiResponse({ status: 200, description: 'Notification deleted' })
  async deleteNotification(
    @Request() req: { user: { userId: string } },
    @Param('id') notificationId: string,
  ) {
    const success = await this.notificationsService.deleteNotification(
      req.user.userId,
      notificationId,
    );
    return { success };
  }

  // ========== Settings ==========

  @Get('settings')
  @ApiOperation({ summary: 'Get notification settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved' })
  async getSettings(@Request() req: { user: { userId: string } }) {
    const settings = await this.notificationsService.getSettings(
      req.user.userId,
    );
    return {
      inApp: settings.inApp,
      email: settings.email,
      push: settings.push,
      hasPushSubscription: !!settings.pushSubscription,
    };
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update notification settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @Request() req: { user: { userId: string } },
    @Body() updates: UpdateNotificationSettingsDto,
  ) {
    const settings = await this.notificationsService.updateSettings(
      req.user.userId,
      updates,
    );
    return {
      inApp: settings.inApp,
      email: settings.email,
      push: settings.push,
      hasPushSubscription: !!settings.pushSubscription,
    };
  }

  @Post('settings/push-subscription')
  @ApiOperation({ summary: 'Save push notification subscription' })
  @ApiResponse({ status: 200, description: 'Push subscription saved' })
  async savePushSubscription(
    @Request() req: { user: { userId: string } },
    @Body() subscription: PushSubscriptionDto,
  ) {
    await this.notificationsService.savePushSubscription(
      req.user.userId,
      subscription,
    );
    return { success: true };
  }

  @Delete('settings/push-subscription')
  @ApiOperation({ summary: 'Remove push notification subscription' })
  @ApiResponse({ status: 200, description: 'Push subscription removed' })
  async removePushSubscription(@Request() req: { user: { userId: string } }) {
    await this.notificationsService.removePushSubscription(req.user.userId);
    return { success: true };
  }
}
