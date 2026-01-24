import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoutesService } from './routes.service';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@shopit/constants';
import { RolesGuard } from '../guards/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    role: number;
  };
}

/**
 * Analytics controller for courier-related endpoints
 * Accessible at /api/v1/analytics/courier
 */
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly routesService: RoutesService) {}

  /**
   * Get courier analytics
   * GET /api/v1/analytics/courier
   */
  @Get('courier')
  @Roles(Role.ADMIN, Role.COURIER)
  async getCourierAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query('period') period?: 'week' | 'month' | 'year' | 'all',
  ) {
    return this.routesService.getCourierAnalytics(
      req.user._id,
      period || 'week',
    );
  }
}
