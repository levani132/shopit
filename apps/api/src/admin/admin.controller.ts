import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
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
  ) {}

  // ===== Site Settings =====

  @Get('settings')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all site settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved' })
  async getSettings() {
    const settings = await this.siteSettingsService.getSettings();
    return { settings };
  }

  @Put('settings')
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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

    if (user.role === 'courier') {
      throw new BadRequestException('User is already a courier');
    }

    user.role = 'courier';
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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

    // Get user's store if they're a seller
    let store = null;
    if (user.role === 'seller') {
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
  @Roles('admin')
  @ApiOperation({ summary: 'Update user role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateUserRole(
    @Param('id') id: string,
    @Body() body: { role: 'user' | 'seller' | 'courier' | 'admin' },
  ) {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const oldRole = user.role;
    user.role = body.role;
    await user.save();

    this.logger.log(
      `User ${user.email} role changed from ${oldRole} to ${body.role}`,
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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
  @Roles('admin')
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

  // ===== Analytics =====

  @Get('analytics/revenue')
  @Roles('admin')
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
  @Roles('admin')
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
