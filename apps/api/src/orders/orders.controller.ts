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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CreateOrderDto, ValidateCartDto } from './dto/order.dto';
import { OrderStatus } from '@sellit/api-database';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

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
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(@CurrentUser() user: { _id: any; id?: string }) {
    const userId = user.id || user._id?.toString();
    console.log('[Orders] my-orders called for userId:', userId, 'user._id:', user._id, 'user.id:', user.id);
    const orders = await this.ordersService.findUserOrders(userId);
    console.log('[Orders] Found orders:', orders.length);
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
}

