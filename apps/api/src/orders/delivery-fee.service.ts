import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Location coordinates
 */
export interface Location {
  lat: number;
  lng: number;
}

/**
 * Delivery fee calculation result
 */
export interface DeliveryFeeResult {
  fee: number; // Fee in GEL
  durationMinutes: number; // Driving duration in minutes
  distanceKm: number; // Distance in kilometers
}

/**
 * Service for calculating delivery fees based on distance/duration
 * Uses OpenRouteService API (free tier: 2000 requests/day)
 *
 * Pricing formula:
 * - 0.5 GEL per minute of driving time
 * - Minimum fee: 3 GEL
 * - Ceiling to 0.5 GEL precision (e.g., 4.3 → 4.5, 4.6 → 5.0)
 */
@Injectable()
export class DeliveryFeeService {
  private readonly logger = new Logger(DeliveryFeeService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.openrouteservice.org/v2';

  // Pricing constants
  private readonly RATE_PER_MINUTE = 0.5; // 0.5 GEL per minute
  private readonly MIN_FEE = 3; // Minimum 3 GEL
  private readonly PRECISION = 0.5; // Ceil to 0.5 GEL

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENROUTE_API_KEY') || '';
    if (!this.apiKey) {
      this.logger.warn(
        'OPENROUTE_API_KEY not configured. Delivery fee calculation will use fallback.',
      );
    }
  }

  /**
   * Calculate delivery fee based on driving time between two locations
   */
  async calculateDeliveryFee(
    origin: Location,
    destination: Location,
  ): Promise<DeliveryFeeResult> {
    try {
      if (!this.apiKey) {
        return this.getFallbackFee();
      }

      // Call OpenRouteService Directions API
      const response = await fetch(
        `${this.baseUrl}/directions/driving-car?` +
          `start=${origin.lng},${origin.lat}&end=${destination.lng},${destination.lat}`,
        {
          headers: {
            Authorization: this.apiKey,
            Accept: 'application/json',
          },
        },
      );

      if (!response.ok) {
        this.logger.error(
          `OpenRouteService API error: ${response.status} ${response.statusText}`,
        );
        return this.getFallbackFee();
      }

      const data = await response.json();

      // Extract duration and distance from response
      // Duration is in seconds, distance is in meters
      const summary = data?.features?.[0]?.properties?.summary;
      if (!summary) {
        this.logger.error('Invalid response from OpenRouteService');
        return this.getFallbackFee();
      }

      const durationMinutes = Math.ceil(summary.duration / 60);
      const distanceKm = Math.round((summary.distance / 1000) * 10) / 10;

      // Calculate fee
      const fee = this.calculateFee(durationMinutes);

      this.logger.debug(
        `Delivery fee calculated: ${fee} GEL for ${durationMinutes} min (${distanceKm} km)`,
      );

      return {
        fee,
        durationMinutes,
        distanceKm,
      };
    } catch (error) {
      this.logger.error('Failed to calculate delivery fee:', error);
      return this.getFallbackFee();
    }
  }

  /**
   * Calculate fee from duration in minutes
   * Formula: max(3, ceil(minutes * 0.5 / 0.5) * 0.5)
   */
  private calculateFee(durationMinutes: number): number {
    const rawFee = durationMinutes * this.RATE_PER_MINUTE;
    const fee = Math.max(this.MIN_FEE, rawFee);
    // Ceil to 0.5 GEL precision: multiply by 2, ceil, divide by 2
    return Math.ceil(fee / this.PRECISION) * this.PRECISION;
  }

  /**
   * Fallback fee when API is unavailable
   */
  private getFallbackFee(): DeliveryFeeResult {
    return {
      fee: 5, // Default fallback fee
      durationMinutes: 15, // Estimated
      distanceKm: 5, // Estimated
    };
  }

  /**
   * Check if the service is properly configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Get estimated delivery time range based on duration and prep time
   */
  getDeliveryTimeEstimate(
    durationMinutes: number,
    prepTimeMinDays: number,
    prepTimeMaxDays: number,
  ): { minDays: number; maxDays: number } {
    // Convert driving time to days (assume 8 hours per day, round up)
    const deliveryDays = Math.ceil(durationMinutes / (8 * 60));

    return {
      minDays: prepTimeMinDays + deliveryDays,
      maxDays: prepTimeMaxDays + deliveryDays,
    };
  }
}

