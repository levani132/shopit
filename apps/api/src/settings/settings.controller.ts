import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SiteSettingsService } from '../admin/site-settings.service';

/**
 * Public settings controller
 * Provides public access to non-sensitive configuration
 */
@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  /**
   * Get shipping size configurations
   * Public endpoint - no auth required
   */
  @Get('shipping-sizes')
  @ApiOperation({ summary: 'Get shipping size configurations' })
  @ApiResponse({ status: 200, description: 'Shipping size configs returned' })
  async getShippingSizes() {
    const settings = await this.siteSettingsService.getSettings();

    return {
      sizes: {
        small: {
          name: 'small',
          maxWeight: settings.bikeShipping.maxWeight,
          maxDimension: settings.bikeShipping.maxDimension,
          ratePerMinute: settings.bikeShipping.ratePerMinute,
          minimumFee: settings.bikeShipping.minimumFee,
          vehicleType: 'bike',
        },
        medium: {
          name: 'medium',
          maxWeight: settings.carShipping.maxWeight,
          maxDimension: settings.carShipping.maxDimension,
          ratePerMinute: settings.carShipping.ratePerMinute,
          minimumFee: settings.carShipping.minimumFee,
          vehicleType: 'car',
        },
        large: {
          name: 'large',
          maxWeight: settings.suvShipping.maxWeight,
          maxDimension: settings.suvShipping.maxDimension,
          ratePerMinute: settings.suvShipping.ratePerMinute,
          minimumFee: settings.suvShipping.minimumFee,
          vehicleType: 'suv',
        },
        extra_large: {
          name: 'extra_large',
          maxWeight: settings.vanShipping.maxWeight,
          maxDimension: settings.vanShipping.maxDimension,
          ratePerMinute: settings.vanShipping.ratePerMinute,
          minimumFee: settings.vanShipping.minimumFee,
          vehicleType: 'van',
        },
      },
    };
  }
}

