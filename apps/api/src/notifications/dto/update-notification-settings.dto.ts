import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { NotificationPreference } from '@sellit/api-database';

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({
    description: 'In-app notification preference',
    enum: NotificationPreference,
  })
  @IsOptional()
  @IsEnum(NotificationPreference)
  inApp?: NotificationPreference;

  @ApiPropertyOptional({
    description: 'Email notification preference',
    enum: NotificationPreference,
  })
  @IsOptional()
  @IsEnum(NotificationPreference)
  email?: NotificationPreference;

  @ApiPropertyOptional({
    description: 'Push notification preference',
    enum: NotificationPreference,
  })
  @IsOptional()
  @IsEnum(NotificationPreference)
  push?: NotificationPreference;
}

export class PushSubscriptionDto {
  @ApiProperty({ description: 'Push subscription endpoint' })
  endpoint!: string;

  @ApiProperty({ description: 'Push subscription keys' })
  keys!: {
    p256dh: string;
    auth: string;
  };
}
