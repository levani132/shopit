import { Role } from '@shopit/constants';
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
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OrdersService } from './orders.service';
import {
  DeliveryFeeService,
  Location,
  ShippingSize,
} from './delivery-fee.service';
import { SiteSettingsService } from '../admin/site-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import {
  CreateOrderDto,
  ValidateCartDto,
  CalculateShippingDto,
} from './dto/order.dto';
import {
  OrderStatus,
  Product,
  ProductDocument,
  OrderDocument,
} from '@shopit/api-database';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly deliveryFeeService: DeliveryFeeService,
    private readonly siteSettingsService: SiteSettingsService,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Transform orders to include calculated courier earnings
   */
  private async addCourierEarningsToOrders(orders: OrderDocument[]) {
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    return orders.map((order) => {
      const orderObj = order.toObject ? order.toObject() : order;
      return {
        ...orderObj,
        courierEarning:
          Math.round(orderObj.shippingPrice * courierEarningsPercentage * 100) /
          100,
      };
    });
  }

  /**
   * Calculate shipping cost between store and customer address
   * Fetches current product sizes from database for accurate calculation
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

    // Determine shipping size from products in database (preferred) or fallback to request
    let shippingSize: ShippingSize = 'small';

    if (dto.products && dto.products.length > 0) {
      // Fetch current product sizes from database
      const productIds = dto.products.map((p) => p.productId);
      const products = await this.productModel
        .find({ _id: { $in: productIds } })
        .select('shippingSize')
        .lean();

      // Find the largest shipping size among all products
      const sizes: ShippingSize[] = ['small', 'medium', 'large', 'extra_large'];
      let maxIndex = 0;

      for (const product of products) {
        const size = (product.shippingSize as ShippingSize) || 'small';
        const index = sizes.indexOf(size);
        if (index > maxIndex) {
          maxIndex = index;
        }
      }

      shippingSize = sizes[maxIndex];
    } else if (dto.shippingSize) {
      // Fallback to provided size (deprecated, but kept for backwards compatibility)
      shippingSize = dto.shippingSize;
    }

    const result = await this.deliveryFeeService.calculateDeliveryFee(
      origin,
      destination,
      shippingSize,
    );

    return {
      fee: result.fee,
      durationMinutes: result.durationMinutes,
      distanceKm: result.distanceKm,
      vehicleType: result.vehicleType,
      shippingSize, // Return the actual size used
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
  async createOrder(@Body() dto: CreateOrderDto, @Request() req: any) {
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
    console.log(
      `[Orders] my-orders request - userId: ${userId}, storeSubdomain: ${storeSubdomain}`,
    );
    const orders = await this.ordersService.findUserOrders(
      userId,
      storeSubdomain,
    );
    return orders;
  }

  /**
   * Get orders for seller's store
   */
  @Get('store-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
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
  async getOrderByExternalId(
    @Param('externalOrderId') externalOrderId: string,
  ) {
    return this.ordersService.findByExternalOrderId(externalOrderId);
  }

  /**
   * Update order status (seller action)
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
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
  @Roles(Role.SELLER, Role.ADMIN)
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
   * Filtered by courier's vehicle type capacity
   * Includes calculated courierEarning based on earnings percentage
   */
  @Get('courier/available')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COURIER, Role.ADMIN)
  async getAvailableOrdersForCourier(
    @CurrentUser()
    user: {
      id: string;
      _id?: { toString(): string };
      vehicleType?: string;
    },
  ) {
    const userId = user.id || user._id?.toString();
    const orders = await this.ordersService.getOrdersReadyForDelivery(
      userId,
      user.vehicleType,
    );
    return this.addCourierEarningsToOrders(orders);
  }

  /**
   * Get orders assigned to the current courier
   * Includes calculated courierEarning based on earnings percentage
   */
  @Get('courier/my-orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COURIER, Role.ADMIN)
  async getCourierOrders(
    @CurrentUser() user: { id: string; _id?: { toString(): string } },
  ) {
    const userId = user.id || user._id?.toString();
    const orders = await this.ordersService.getOrdersByCourier(userId);
    return this.addCourierEarningsToOrders(orders);
  }

  /**
   * Get completed orders delivered by the current courier
   * Includes calculated courierEarning based on earnings percentage
   */
  @Get('courier/completed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COURIER, Role.ADMIN)
  async getCompletedCourierOrders(
    @CurrentUser() user: { id: string; _id?: { toString(): string } },
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const userId = user.id || user._id?.toString();
    const orders = await this.ordersService.getCompletedOrdersByCourier(
      userId,
      limit,
    );
    return this.addCourierEarningsToOrders(orders);
  }

  /**
   * Update order status (courier action)
   * Only for ShopIt delivery orders
   */
  @Patch(':id/courier-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COURIER, Role.ADMIN)
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
  @Roles(Role.COURIER, Role.ADMIN)
  async assignOrderToCourier(
    @Param('id') id: string,
    @CurrentUser() user: { id: string; _id?: { toString(): string } },
  ) {
    const userId = user.id || user._id?.toString();
    return this.ordersService.assignCourier(id, userId);
  }
}
