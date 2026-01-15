import { Role } from '@sellit/constants';
import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { SiteSettingsService } from './site-settings.service';
import {
  UpdateSiteSettingsDto,
  CourierApplicationActionDto,
  ListUsersQueryDto,
  ListStoresQueryDto,
  ListOrdersQueryDto,
} from './dto';
import {
  User,
  UserDocument,
  Store,
  StoreDocument,
  Order,
  OrderDocument,
} from '@sellit/api-database';
import { BalanceService } from '../orders/balance.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(
    private readonly siteSettingsService: SiteSettingsService,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Store.name) private readonly storeModel: Model<StoreDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @Inject(forwardRef(() => BalanceService))
    private readonly balanceService: BalanceService,
  ) {}

  // ===== Site Settings =====

  @Get('settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all site settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved' })
  async getSettings() {
    const settings = await this.siteSettingsService.getSettings();
    return { settings };
  }

  @Put('settings')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update site settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Body() dto: UpdateSiteSettingsDto) {
    const settings = await this.siteSettingsService.updateSettings(dto);
    return {
      message: 'Settings updated successfully',
      settings,
    };
  }

  // ===== Dashboard Stats =====

  @Get('dashboard')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get admin dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard stats retrieved' })
  async getDashboardStats() {
    const [
      totalUsers,
      totalSellers,
      totalCouriers,
      totalStores,
      publishedStores,
      pendingStores,
      totalOrders,
      pendingOrders,
      paidOrders,
      deliveredOrders,
      pendingCourierApplications,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.userModel.countDocuments({ role: 'seller' }),
      this.userModel.countDocuments({ role: 'courier' }),
      this.storeModel.countDocuments(),
      this.storeModel.countDocuments({ publishStatus: 'published' }),
      this.storeModel.countDocuments({ publishStatus: 'pending_review' }),
      this.orderModel.countDocuments(),
      this.orderModel.countDocuments({ status: 'pending' }),
      this.orderModel.countDocuments({ status: 'paid' }),
      this.orderModel.countDocuments({ status: 'delivered' }),
      this.userModel.countDocuments({
        courierMotivationLetter: { $exists: true, $ne: '' },
        role: { $ne: 'courier' },
      }),
    ]);

    // Calculate total revenue from delivered orders
    const revenueResult = await this.orderModel.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayOrders, todayUsers, todayStores] = await Promise.all([
      this.orderModel.countDocuments({ createdAt: { $gte: today } }),
      this.userModel.countDocuments({ createdAt: { $gte: today } }),
      this.storeModel.countDocuments({ createdAt: { $gte: today } }),
    ]);

    return {
      users: {
        total: totalUsers,
        sellers: totalSellers,
        couriers: totalCouriers,
        todayNew: todayUsers,
      },
      stores: {
        total: totalStores,
        published: publishedStores,
        pendingReview: pendingStores,
        todayNew: todayStores,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        paid: paidOrders,
        delivered: deliveredOrders,
        todayNew: todayOrders,
      },
      revenue: {
        total: totalRevenue,
      },
      pendingApprovals: {
        stores: pendingStores,
        couriers: pendingCourierApplications,
      },
    };
  }

  // ===== Pending Store Approvals =====

  @Get('stores/pending')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get pending store publish requests' })
  @ApiResponse({ status: 200, description: 'Pending stores retrieved' })
  async getPendingStores() {
    const stores = await this.storeModel
      .find({ publishStatus: 'pending_review' })
      .populate('ownerId', 'firstName lastName email')
      .sort({ publishRequestedAt: 1 })
      .lean();

    return { stores };
  }

  @Post('stores/:id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve store publish request' })
  @ApiResponse({ status: 200, description: 'Store approved' })
  async approveStore(@Param('id') id: string) {
    const store = await this.storeModel.findById(id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.publishStatus !== 'pending_review') {
      throw new BadRequestException('Store is not pending review');
    }

    store.publishStatus = 'published';
    store.publishedAt = new Date();
    await store.save();

    this.logger.log(`Store ${store.subdomain} approved for publishing`);

    return {
      message: 'Store approved successfully',
      store: {
        id: store._id,
        name: store.name,
        subdomain: store.subdomain,
        publishStatus: store.publishStatus,
      },
    };
  }

  @Post('stores/:id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject store publish request' })
  @ApiResponse({ status: 200, description: 'Store rejected' })
  async rejectStore(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const store = await this.storeModel.findById(id);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.publishStatus !== 'pending_review') {
      throw new BadRequestException('Store is not pending review');
    }

    store.publishStatus = 'rejected';
    store.publishRejectionReason = body.reason || 'No reason provided';
    await store.save();

    this.logger.log(`Store ${store.subdomain} rejected: ${body.reason}`);

    return {
      message: 'Store rejected',
      store: {
        id: store._id,
        name: store.name,
        subdomain: store.subdomain,
        publishStatus: store.publishStatus,
        rejectionReason: store.publishRejectionReason,
      },
    };
  }

  // ===== Pending Courier Approvals =====

  @Get('couriers/pending')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get pending courier applications' })
  @ApiResponse({ status: 200, description: 'Pending couriers retrieved' })
  async getPendingCouriers() {
    const couriers = await this.userModel
      .find({
        courierMotivationLetter: { $exists: true, $ne: '' },
        role: { $ne: 'courier' },
      })
      .select(
        'firstName lastName email courierMotivationLetter courierProfileImage accountNumber createdAt',
      )
      .sort({ createdAt: 1 })
      .lean();

    return { couriers };
  }

  @Post('couriers/:id/approve')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Approve courier application' })
  @ApiResponse({ status: 200, description: 'Courier approved' })
  async approveCourier(@Param('id') id: string) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.courierMotivationLetter) {
      throw new BadRequestException('User has not applied to be a courier');
    }

    // Check if user already has courier role using bitmask
    if ((user.role & Role.COURIER) !== 0) {
      throw new BadRequestException('User is already a courier');
    }

    // Add courier role to existing roles
    user.role = user.role | Role.COURIER;
    await user.save();

    this.logger.log(`User ${user.email} approved as courier`);

    return {
      message: 'Courier approved successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  @Post('couriers/:id/reject')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reject courier application' })
  @ApiResponse({ status: 200, description: 'Courier rejected' })
  async rejectCourier(
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Clear courier application data
    user.courierMotivationLetter = undefined;
    user.courierProfileImage = undefined;
    await user.save();

    this.logger.log(
      `Courier application rejected for ${user.email}: ${body.reason}`,
    );

    return {
      message: 'Courier application rejected',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  // ===== Users Management =====

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  async listUsers(@Query() query: ListUsersQueryDto) {
    const { page = 1, limit = 20, role, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .select('-password -refreshTokenHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('users/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get user details' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  async getUser(@Param('id') id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -refreshTokenHash')
      .lean();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user's store if they're a seller (using bitmask check)
    let store = null;
    if ((user.role & Role.SELLER) !== 0) {
      store = await this.storeModel.findOne({ ownerId: user._id }).lean();
    }

    // Get user's order count
    const orderCount = await this.orderModel.countDocuments({
      userId: user._id,
    });

    return {
      user,
      store,
      orderCount,
    };
  }

  @Put('users/:id/role')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: number },
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate role is a valid bitmask (between 1 and 15)
    const newRole = body.role;
    if (typeof newRole !== 'number' || newRole < 1 || newRole > 15) {
      throw new BadRequestException(
        'Invalid role value. Must be between 1 and 15.',
      );
    }

    // USER bit (1) must always be set
    const roleWithUser = newRole | Role.USER;

    const oldRole = user.role;
    user.role = roleWithUser;
    await user.save();

    this.logger.log(
      `User ${user.email} role changed from ${oldRole} to ${roleWithUser}`,
    );

    return {
      message: 'Role updated successfully',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ===== Stores Management =====

  @Get('stores')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all stores' })
  @ApiResponse({ status: 200, description: 'Stores retrieved' })
  async listStores(@Query() query: ListStoresQueryDto) {
    const { page = 1, limit = 20, publishStatus, search } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (publishStatus) {
      filter.publishStatus = publishStatus;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { subdomain: { $regex: search, $options: 'i' } },
      ];
    }

    const [stores, total] = await Promise.all([
      this.storeModel
        .find(filter)
        .populate('ownerId', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.storeModel.countDocuments(filter),
    ]);

    return {
      stores,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('stores/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get store details' })
  @ApiResponse({ status: 200, description: 'Store retrieved' })
  async getStore(@Param('id') id: string) {
    const store = await this.storeModel
      .findById(id)
      .populate('ownerId', 'firstName lastName email')
      .lean();

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Get store's order count and revenue
    const storeOrders = await this.orderModel.aggregate([
      { $unwind: '$items' },
      { $match: { 'items.storeId': new Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          orderCount: { $addToSet: '$_id' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
        },
      },
    ]);

    return {
      store,
      stats: {
        orderCount: storeOrders[0]?.orderCount?.length || 0,
        totalRevenue: storeOrders[0]?.totalRevenue || 0,
      },
    };
  }

  // ===== Orders Overview =====

  @Get('orders')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'List all orders' })
  @ApiResponse({ status: 200, description: 'Orders retrieved' })
  async listOrders(@Query() query: ListOrdersQueryDto) {
    const { page = 1, limit = 20, status, storeId } = query;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (storeId) {
      filter['items.storeId'] = new Types.ObjectId(storeId);
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  @Get('orders/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get order details' })
  @ApiResponse({ status: 200, description: 'Order retrieved' })
  async getOrder(@Param('id') id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate('user', 'firstName lastName email')
      .lean();

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { order };
  }

  @Patch('orders/:id/status')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const order = await this.orderModel.findById(id);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const previousStatus = order.status;

    const validStatuses = [
      'pending',
      'paid',
      'processing',
      'ready_for_delivery',
      'shipped',
      'delivered',
      'cancelled',
      'refunded',
    ];
    if (!validStatuses.includes(body.status)) {
      throw new BadRequestException(
        `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      );
    }

    // Set timestamps and sync boolean flags based on status
    const now = new Date();

    // Sync isPaid flag - any status after 'pending' means the order was paid
    if (body.status !== 'pending' && body.status !== 'cancelled') {
      order.isPaid = true;
      if (!order.paidAt) {
        order.paidAt = now;
      }
    }

    if (body.status === 'shipped' && !order.shippedAt) {
      order.shippedAt = now;
    }

    // Sync isDelivered flag with status
    if (body.status === 'delivered') {
      order.isDelivered = true;
      if (!order.deliveredAt) {
        order.deliveredAt = now;
      }
    } else {
      // If moving away from delivered status, reset the flag
      order.isDelivered = false;
    }

    if (body.status === 'cancelled') {
      order.cancelledAt = now;
    }

    order.status = body.status as any;
    await order.save();

    // Process seller earnings when order becomes delivered (and wasn't already)
    if (body.status === 'delivered' && previousStatus !== 'delivered') {
      try {
        await this.balanceService.processOrderEarnings(order);
        this.logger.log(
          `Processed earnings for order ${id} via admin status update`,
        );
      } catch (err) {
        this.logger.error(`Failed to process earnings for order ${id}: ${err}`);
        // Don't fail the status update, earnings processing failure shouldn't block it
      }
    }

    this.logger.log(`Admin updated order ${id} status to ${body.status}`);

    return {
      message: 'Order status updated',
      order: {
        _id: order._id,
        status: order.status,
        isPaid: order.isPaid,
        isDelivered: order.isDelivered,
        paidAt: order.paidAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
      },
    };
  }

  // ===== Analytics =====

  @Get('analytics/revenue')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved' })
  async getRevenueAnalytics(@Query('period') period: string = 'month') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Daily revenue for the period
    const dailyRevenue = await this.orderModel.aggregate([
      {
        $match: {
          status: 'delivered',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' },
          },
          revenue: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ]);

    // Total for period
    const periodTotal = dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    const periodOrders = dailyRevenue.reduce(
      (sum, day) => sum + day.orderCount,
      0,
    );

    return {
      period,
      startDate,
      endDate: now,
      dailyRevenue: dailyRevenue.map((d) => ({
        date: `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`,
        revenue: d.revenue,
        orderCount: d.orderCount,
      })),
      totals: {
        revenue: periodTotal,
        orders: periodOrders,
        averageOrderValue: periodOrders > 0 ? periodTotal / periodOrders : 0,
      },
    };
  }

  @Get('analytics/stores')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get store analytics' })
  @ApiResponse({ status: 200, description: 'Store analytics retrieved' })
  async getStoreAnalytics() {
    // Top stores by revenue
    const topStores = await this.orderModel.aggregate([
      { $match: { status: 'delivered' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.storeId',
          storeName: { $first: '$items.storeName' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } },
          orderCount: { $addToSet: '$_id' },
          itemsSold: { $sum: '$items.qty' },
        },
      },
      {
        $project: {
          storeId: '$_id',
          storeName: 1,
          totalRevenue: 1,
          orderCount: { $size: '$orderCount' },
          itemsSold: 1,
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    // Store status distribution
    const statusDistribution = await this.storeModel.aggregate([
      {
        $group: {
          _id: '$publishStatus',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      topStores,
      statusDistribution: statusDistribution.reduce(
        (acc, item) => ({ ...acc, [item._id || 'draft']: item.count }),
        {},
      ),
    };
  }
}
