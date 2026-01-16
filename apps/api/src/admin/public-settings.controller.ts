import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SiteSettingsService } from './site-settings.service';

/**
 * Public settings endpoint - no authentication required
 * Exposes only non-sensitive settings for pricing pages, terms, etc.
 */
@ApiTags('Public Settings')
@Controller('admin/settings')
export class PublicSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get('public')
  @ApiOperation({ summary: 'Get public site settings (no auth required)' })
  @ApiResponse({ status: 200, description: 'Public settings retrieved' })
  async getPublicSettings() {
    const settings = await this.siteSettingsService.getSettings();
    return {
      siteCommissionRate: settings.siteCommissionRate,
      courierEarningsPercentage: settings.courierEarningsPercentage,
      minimumWithdrawalAmount: settings.minimumWithdrawalAmount,
      platformName: settings.platformName,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
    };
  }
}
