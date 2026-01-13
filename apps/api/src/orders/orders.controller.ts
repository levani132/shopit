import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { DeliveryFeeService, Location } from './delivery-fee.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateOrderDto, ValidateCartDto, CalculateShippingDto } from './dto/order.dto';
import { OrderStatus } from '@sellit/api-database';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly deliveryFeeService: DeliveryFeeService,
  ) {}

  /**
   * Calculate shipping cost between store and customer address
   * Public endpoint - works for guests and authenticated users
   */
  @Post('calculate-shipping')
  async calculateShipping(@Body() dto: CalculateShippingDto) {
    const origin: Location = {
      lat: dto.storeLocation.lat,
      lng: dto.storeLocation.lng,
    };
    const destination: Location = {
      lat: dto.customerLocation.lat,
      lng: dto.customerLocation.lng,
    };

    const result = await this.deliveryFeeService.calculateDeliveryFee(
      origin,
      destination,
    );

    return {
      fee: result.fee,
      durationMinutes: result.durationMinutes,
      distanceKm: result.distanceKm,
      currency: 'GEL',
    };
  }

  /**
   * Validate cart items (check stock availability)
   * Public endpoint - works for guests and authenticated users
   */
  @Post('validate-cart')
  async validateCart(@Body() dto: ValidateCartDto) {
    return this.ordersService.validateCart(dto);
  }

  /**
   * Create a new order
   * Can be used for both authenticated and guest checkout
   * Uses OptionalJwtAuthGuard to populate req.user if authenticated
   */
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Request() req: any,
  ) {
    // req.user is populated if authenticated, null otherwise
    // Convert ObjectId to string if necessary
    const rawUserId = req.user?.id || req.user?._id;
    const userId = rawUserId ? String(rawUserId) : undefined;
    return this.ordersService.createOrder(dto, userId);
  }

  /**
   * Create order as authenticated user
   */
  @Post('authenticated')
  @UseGuards(JwtAuthGuard)
  async createAuthenticatedOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: { _id: any; id?: string },
  ) {
    const userId = user.id || user._id?.toString();
    return this.ordersService.createOrder(dto, userId);
  }

  /**
   * Get current user's orders
   * Optionally filter by store subdomain
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @CurrentUser() user: { _id: any; id?: string },
    @Query('storeSubdomain') storeSubdomain?: string,
  ) {
    const userId = user.id || user._id?.toString();
    console.log(`[Orders] my-orders request - userId: ${userId}, storeSubdomain: ${storeSubdomain}`);
    const orders = await this.ordersService.findUserOrders(userId, storeSubdomain);
    return orders;
  }

  /**
   * Get orders for seller's store
   */
  @Get('store-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async getStoreOrders(@CurrentUser() user: { storeId: string }) {
    return this.ordersService.findStoreOrders(user.storeId);
  }

  /**
   * Get single order by ID
   */
  @Get(':id')
  async getOrder(@Param('id') id: string) {
    return this.ordersService.findById(id);
  }

  /**
   * Get order by external order ID (for payment verification)
   */
  @Get('external/:externalOrderId')
  async getOrderByExternalId(@Param('externalOrderId') externalOrderId: string) {
    return this.ordersService.findByExternalOrderId(externalOrderId);
  }

  /**
   * Update order status (seller action)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
    @CurrentUser() user: { storeId: string },
  ) {
    return this.ordersService.updateStatus(id, user.storeId, body.status);
  }

  /**
   * Mark order as delivered (seller action)
   */
  @Patch(':id/delivered')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('seller', 'admin')
  async markAsDelivered(
    @Param('id') id: string,
    @CurrentUser() user: { storeId: string },
  ) {
    return this.ordersService.updateStatus(
      id,
      user.storeId,
      OrderStatus.DELIVERED,
    );
  }

  /**
   * Cancel an order
   */
  @Patch(':id/cancel')
  async cancelOrder(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.ordersService.cancelOrder(id, body.reason);
  }

  // ================== COURIER ENDPOINTS ==================

  /**
   * Get orders ready for delivery (courier action)
   * Returns orders with status READY_FOR_DELIVERY that use ShopIt delivery
   */
  @Get('courier/available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('courier', 'admin')
  async getAvailableOrdersForCourier() {
    return this.ordersService.getOrdersReadyForDelivery();
  }

  /**
   * Get orders assigned to the current courier
   */
  @Get('courier/my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('courier', 'admin')
  async getCourierOrders(@CurrentUser() user: { id: string; _id?: { toString(): string } }) {
    const userId = user.id || user._id?.toString();
    return this.ordersService.getOrdersByCourier(userId);
  }

  /**
   * Update order status (courier action)
   * Only for ShopIt delivery orders
   */
  @Patch(':id/courier-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('courier', 'admin')
  async updateOrderStatusByCourier(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
    @CurrentUser() user: { id: string; _id?: { toString(): string } },
  ) {
    const userId = user.id || user._id?.toString();
    return this.ordersService.updateStatusByCourier(id, userId, body.status);
  }

  /**
   * Assign order to courier (courier picks up the order)
   */
  @Patch(':id/assign-courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('courier', 'admin')
  async assignOrderToCourier(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; _id?: { toString(): string } },
  ) {
    const userId = user.id || user._id?.toString();
    return this.ordersService.assignCourier(id, userId);
  }
}

