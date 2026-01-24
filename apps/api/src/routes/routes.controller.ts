import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoutesService } from './routes.service';
import {
  GenerateRoutesDto,
  ClaimRouteDto,
  UpdateProgressDto,
  AbandonRouteDto,
} from './dto/routes.dto';
import { Roles } from '../decorators/roles.decorator';
import { Role } from '@shopit/constants';
import { RolesGuard } from '../guards/roles.guard';

interface AuthenticatedRequest extends Request {
  user: {
    _id: string;
    role: number;
    vehicleType?: string;
  };
}

@Controller('routes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.COURIER)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  /**
   * Generate route options for different durations
   * Returns routes for 1h, 2h, 3h, 4h, 5h, 6h, 7h, 8h
   */
  @Post('generate')
  @HttpCode(HttpStatus.OK)
  async generateRoutes(
    @Req() req: AuthenticatedRequest,
    @Body() dto: GenerateRoutesDto,
  ) {
    return this.routesService.generateRoutes(req.user._id, dto);
  }

  /**
   * Claim a route - assigns orders to courier and creates active route
   */
  @Post('claim')
  async claimRoute(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ClaimRouteDto,
  ) {
    return this.routesService.claimRoute(req.user._id, dto);
  }

  /**
   * Get courier's active route
   */
  @Get('active')
  async getActiveRoute(@Req() req: AuthenticatedRequest) {
    const route = await this.routesService.getActiveRoute(req.user._id);
    return { route };
  }

  /**
   * Update route progress (mark stop as arrived, completed, or skipped)
   */
  @Patch(':id/progress')
  async updateProgress(
    @Req() req: AuthenticatedRequest,
    @Param('id') routeId: string,
    @Body() dto: UpdateProgressDto,
  ) {
    return this.routesService.updateProgress(
      req.user._id,
      routeId,
      dto.stopIndex,
      dto.action,
    );
  }

  /**
   * Signal that courier cannot carry more items
   * Reorders remaining stops to prioritize deliveries
   */
  @Post(':id/cannot-carry')
  @HttpCode(HttpStatus.OK)
  async cannotCarryMore(
    @Req() req: AuthenticatedRequest,
    @Param('id') routeId: string,
  ) {
    return this.routesService.cannotCarryMore(req.user._id, routeId);
  }

  /**
   * Abandon route - releases undelivered orders
   */
  @Post(':id/abandon')
  @HttpCode(HttpStatus.OK)
  async abandonRoute(
    @Req() req: AuthenticatedRequest,
    @Param('id') routeId: string,
    @Body() dto: AbandonRouteDto,
  ) {
    return this.routesService.abandonRoute(req.user._id, routeId, dto.reason);
  }

  /**
   * Complete route (called automatically when all stops are done)
   */
  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeRoute(
    @Req() req: AuthenticatedRequest,
    @Param('id') routeId: string,
  ) {
    // Route is automatically completed when all stops are processed
    // This endpoint is for manual completion if needed
    const route = await this.routesService.getActiveRoute(req.user._id);
    if (route && route._id.toString() === routeId) {
      // Mark remaining stops as completed
      for (let i = route.currentStopIndex; i < route.stops.length; i++) {
        await this.routesService.updateProgress(
          req.user._id,
          routeId,
          i,
          'completed',
        );
      }
    }
    return { success: true };
  }

  /**
   * Get route history
   */
  @Get('history')
  async getRouteHistory(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
  ) {
    const routes = await this.routesService.getRouteHistory(
      req.user._id,
      limit ? parseInt(limit, 10) : 20,
    );
    return { routes };
  }

  /**
   * Get courier analytics
   * Returns delivery stats, earnings, and performance metrics
   */
  @Get('analytics')
  async getCourierAnalytics(
    @Req() req: AuthenticatedRequest,
    @Query('period') period?: 'week' | 'month' | 'year' | 'all',
  ) {
    return this.routesService.getCourierAnalytics(
      req.user._id,
      period || 'week',
    );
  }

  /**
   * Get detailed route with time tracking
   */
  @Get(':id/details')
  async getRouteDetails(
    @Req() req: AuthenticatedRequest,
    @Param('id') routeId: string,
  ) {
    return this.routesService.getRouteDetails(req.user._id, routeId);
  }
}
