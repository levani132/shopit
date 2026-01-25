import { Role } from '@shopit/constants';
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CourierAdminService } from './courier-admin.service';

@ApiTags('Courier Admin')
@ApiBearerAuth()
@Controller('courier-admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CourierAdminController {
  private readonly logger = new Logger(CourierAdminController.name);

  constructor(private readonly courierAdminService: CourierAdminService) {}

  @Get('analytics')
  @Roles(Role.COURIER_ADMIN)
  @ApiOperation({ summary: 'Get courier admin analytics dashboard' })
  @ApiResponse({ status: 200, description: 'Analytics data retrieved' })
  async getAnalytics() {
    return this.courierAdminService.getAnalytics();
  }

  @Get('couriers')
  @Roles(Role.COURIER_ADMIN)
  @ApiOperation({ summary: 'Get list of all couriers' })
  @ApiResponse({ status: 200, description: 'Couriers list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  async getCouriers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.courierAdminService.getCouriers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      sortBy,
    });
  }

  @Get('orders')
  @Roles(Role.COURIER_ADMIN)
  @ApiOperation({ summary: 'Get all delivery orders' })
  @ApiResponse({ status: 200, description: 'Orders list retrieved' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'urgentOnly', required: false, type: Boolean })
  @ApiQuery({ name: 'dateFilter', required: false, type: String })
  async getOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('urgentOnly') urgentOnly?: string,
    @Query('dateFilter') dateFilter?: string,
  ) {
    return this.courierAdminService.getOrders({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      status,
      urgentOnly: urgentOnly === 'true',
      dateFilter,
    });
  }

  @Get('couriers/:id')
  @Roles(Role.COURIER_ADMIN)
  @ApiOperation({ summary: 'Get courier details with analytics' })
  @ApiResponse({ status: 200, description: 'Courier details retrieved' })
  async getCourierDetails(@Param('id') courierId: string) {
    return this.courierAdminService.getCourierDetails(courierId);
  }

  @Get('orders/:id')
  @Roles(Role.COURIER_ADMIN)
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, description: 'Order details retrieved' })
  async getOrderDetails(@Param('id') orderId: string) {
    return this.courierAdminService.getOrderDetails(orderId);
  }
}
