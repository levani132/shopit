import { Role } from '@shopit/constants';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Store,
  StoreDocument,
  User,
  UserDocument,
  Product,
  ProductDocument,
  Order,
  OrderDocument,
  OrderStatus,
} from '@shopit/api-database';

export interface UpdateStoreDto {
  name?: string;
  nameKa?: string;
  nameEn?: string;
  description?: string;
  descriptionKa?: string;
  descriptionEn?: string;
  aboutUs?: string;
  aboutUsKa?: string;
  aboutUsEn?: string;
  authorName?: string;
  authorNameKa?: string;
  authorNameEn?: string;
  brandColor?: string;
  useInitialAsLogo?: boolean;
  useDefaultCover?: boolean;
  showAuthorName?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  location?: string; // JSON string with { lat, lng }
  hideAddress?: string; // "true" or "false" from form data
  socialLinks?: string; // JSON string
  homepageProductOrder?: string; // 'popular', 'newest', 'price_asc', 'price_desc', 'random'
  // Delivery settings
  courierType?: string; // 'shopit' or 'seller'
  noPrepRequired?: string; // 'true' or 'false' (from form data)
  prepTimeMinDays?: number;
  prepTimeMaxDays?: number;
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
  deliveryFee?: number;
  freeDelivery?: boolean;
  selfPickupEnabled?: string; // 'true' or 'false' from form data
}

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async findBySubdomain(subdomain: string): Promise<StoreDocument | null> {
    return this.storeModel.findOne({
      subdomain: subdomain.toLowerCase(),
      isActive: true,
    });
  }

  /**
   * Find store by subdomain without checking isActive status
   * Used for status checks where we need to find inactive/unpublished stores
   */
  async findBySubdomainAny(subdomain: string): Promise<StoreDocument | null> {
    return this.storeModel.findOne({
      subdomain: subdomain.toLowerCase(),
    });
  }

  async findById(id: string): Promise<StoreDocument | null> {
    return this.storeModel.findById(id);
  }

  async findByOwnerId(ownerId: string): Promise<StoreDocument | null> {
    // Try with ObjectId first, then fall back to string
    try {
      const objectId = new Types.ObjectId(ownerId);
      console.log(
        '[StoresService.findByOwnerId] Searching for ownerId:',
        ownerId,
        'as ObjectId:',
        objectId,
      );
      const store = await this.storeModel.findOne({ ownerId: objectId });
      console.log(
        '[StoresService.findByOwnerId] Result:',
        store ? `Found store ${store._id}` : 'Not found',
      );
      return store;
    } catch (error) {
      console.error(
        '[StoresService.findByOwnerId] Error converting to ObjectId:',
        error,
      );
      // Try with string as fallback
      return this.storeModel.findOne({ ownerId });
    }
  }

  async getStoreProducts(storeId: string): Promise<any[]> {
    // TODO: Implement when Product model is created
    // For now, return empty array
    return [];
  }

  async getFeaturedStores(limit = 6): Promise<StoreDocument[]> {
    return this.storeModel
      .find({ isActive: true, isFeatured: true })
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async getAllActiveStores(
    page = 1,
    limit = 20,
  ): Promise<{ stores: StoreDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      this.storeModel
        .find({ isActive: true })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.storeModel.countDocuments({ isActive: true }),
    ]);

    return { stores, total };
  }

  async updateStore(
    ownerId: string,
    dto: UpdateStoreDto,
    logoUrl?: string,
    coverUrl?: string,
  ): Promise<StoreDocument> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Update basic fields
    if (dto.name) store.name = dto.name;
    if (dto.brandColor) store.brandColor = dto.brandColor;
    if (dto.phone !== undefined) store.phone = dto.phone;
    if (dto.email !== undefined) store.email = dto.email;
    if (dto.address !== undefined) store.address = dto.address;
    if (dto.location !== undefined) {
      try {
        store.location = JSON.parse(dto.location);
      } catch {
        // Invalid JSON, ignore
      }
    }
    if (dto.hideAddress !== undefined)
      store.hideAddress = dto.hideAddress === 'true';

    // Update localized fields
    if (dto.nameKa || dto.nameEn) {
      store.nameLocalized = {
        ka: dto.nameKa || store.nameLocalized?.ka,
        en: dto.nameEn || store.nameLocalized?.en,
      };
      // Also update legacy name field
      store.name = dto.nameEn || dto.nameKa || store.name;
    }

    if (dto.descriptionKa !== undefined || dto.descriptionEn !== undefined) {
      store.descriptionLocalized = {
        ka: dto.descriptionKa ?? store.descriptionLocalized?.ka,
        en: dto.descriptionEn ?? store.descriptionLocalized?.en,
      };
      // Also update legacy description field
      store.description =
        dto.descriptionEn || dto.descriptionKa || store.description;
    }

    if (dto.authorNameKa !== undefined || dto.authorNameEn !== undefined) {
      store.authorNameLocalized = {
        ka: dto.authorNameKa ?? store.authorNameLocalized?.ka,
        en: dto.authorNameEn ?? store.authorNameLocalized?.en,
      };
      // Also update legacy authorName field
      store.authorName =
        dto.authorNameEn || dto.authorNameKa || store.authorName;
    }

    if (dto.aboutUsKa !== undefined || dto.aboutUsEn !== undefined) {
      store.aboutUsLocalized = {
        ka: dto.aboutUsKa ?? store.aboutUsLocalized?.ka,
        en: dto.aboutUsEn ?? store.aboutUsLocalized?.en,
      };
      // Also update legacy aboutUs field
      store.aboutUs = dto.aboutUsEn || dto.aboutUsKa || store.aboutUs;
    }

    // Update boolean fields
    if (dto.useInitialAsLogo !== undefined) {
      store.useInitialAsLogo =
        dto.useInitialAsLogo === true ||
        dto.useInitialAsLogo === ('true' as unknown as boolean);
    }
    if (dto.useDefaultCover !== undefined) {
      store.useDefaultCover =
        dto.useDefaultCover === true ||
        dto.useDefaultCover === ('true' as unknown as boolean);
    }
    if (dto.showAuthorName !== undefined) {
      store.showAuthorName =
        dto.showAuthorName === true ||
        dto.showAuthorName === ('true' as unknown as boolean);
    }

    // Update social links
    if (dto.socialLinks) {
      try {
        store.socialLinks = JSON.parse(dto.socialLinks);
      } catch {
        // Keep existing social links if parsing fails
      }
    }

    // Update images
    if (logoUrl) {
      store.logo = logoUrl;
      store.useInitialAsLogo = false;
    }
    if (coverUrl) {
      store.coverImage = coverUrl;
      store.useDefaultCover = false;
    }

    // Update homepage product order
    if (dto.homepageProductOrder) {
      const validOrders = [
        'popular',
        'newest',
        'price_asc',
        'price_desc',
        'random',
      ];
      if (validOrders.includes(dto.homepageProductOrder)) {
        store.homepageProductOrder = dto.homepageProductOrder;
      }
    }

    // Update delivery settings
    if (dto.courierType !== undefined) {
      const validCourierTypes = ['shopit', 'seller'];
      if (validCourierTypes.includes(dto.courierType)) {
        store.courierType = dto.courierType;
      }
    }
    if (dto.noPrepRequired !== undefined) {
      store.noPrepRequired = dto.noPrepRequired === 'true';
    }
    if (dto.prepTimeMinDays !== undefined) {
      store.prepTimeMinDays = Math.max(0, Number(dto.prepTimeMinDays));
    }
    if (dto.prepTimeMaxDays !== undefined) {
      store.prepTimeMaxDays = Math.max(0, Number(dto.prepTimeMaxDays));
    }
    if (dto.deliveryMinDays !== undefined) {
      store.deliveryMinDays = Math.max(0, Number(dto.deliveryMinDays));
    }
    if (dto.deliveryMaxDays !== undefined) {
      store.deliveryMaxDays = Math.max(0, Number(dto.deliveryMaxDays));
    }
    if (dto.deliveryFee !== undefined) {
      store.deliveryFee = Math.max(0, Number(dto.deliveryFee));
    }
    if (dto.freeDelivery !== undefined) {
      store.freeDelivery =
        dto.freeDelivery === true ||
        dto.freeDelivery === ('true' as unknown as boolean);
    }
    if (dto.selfPickupEnabled !== undefined) {
      store.selfPickupEnabled = dto.selfPickupEnabled === 'true';
    }

    await store.save();
    return store;
  }

  /**
   * Check if a subdomain is available
   */
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const normalizedSubdomain = subdomain.toLowerCase().trim();
    const existingStore = await this.storeModel.findOne({
      subdomain: normalizedSubdomain,
    });
    return !existingStore;
  }

  /**
   * Validate subdomain format
   */
  validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
    const normalized = subdomain.toLowerCase().trim();

    // Must be at least 3 characters
    if (normalized.length < 3) {
      return { valid: false, error: 'Subdomain must be at least 3 characters' };
    }

    // Must be at most 30 characters
    if (normalized.length > 30) {
      return { valid: false, error: 'Subdomain must be at most 30 characters' };
    }

    // Must start with a letter
    if (!/^[a-z]/.test(normalized)) {
      return { valid: false, error: 'Subdomain must start with a letter' };
    }

    // Must only contain letters, numbers, and hyphens
    if (
      !/^[a-z][a-z0-9-]*[a-z0-9]$/.test(normalized) &&
      normalized.length > 1
    ) {
      return {
        valid: false,
        error: 'Subdomain can only contain letters, numbers, and hyphens',
      };
    }

    // Reserved subdomains
    const reserved = [
      'www',
      'api',
      'admin',
      'app',
      'dashboard',
      'store',
      'shop',
      'mail',
      'email',
      'support',
      'help',
      'blog',
      'cdn',
      'assets',
      'static',
      'test',
      'dev',
      'staging',
      'prod',
      'production',
      'courier',
      'couriers',
    ];
    if (reserved.includes(normalized)) {
      return { valid: false, error: 'This subdomain is reserved' };
    }

    return { valid: true };
  }

  /**
   * Change store subdomain (FREE change only - first change)
   * For paid changes, use the payment flow via ServicePaymentService
   */
  async changeSubdomainFree(
    ownerId: string,
    newSubdomain: string,
  ): Promise<{
    store: StoreDocument;
    success: boolean;
  }> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check if this is the first change (free)
    const changeCount = store.subdomainChangeCount || 0;
    if (changeCount >= 1) {
      throw new BadRequestException(
        'Your free subdomain change has been used. Subsequent changes require a payment of ₾10.',
      );
    }

    const normalizedSubdomain = newSubdomain.toLowerCase().trim();

    // Check if it's the same subdomain
    if (store.subdomain === normalizedSubdomain) {
      throw new BadRequestException('New subdomain is the same as current');
    }

    // Validate subdomain format
    const validation = this.validateSubdomain(normalizedSubdomain);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Check availability
    const isAvailable = await this.isSubdomainAvailable(normalizedSubdomain);
    if (!isAvailable) {
      throw new ConflictException('This subdomain is already taken');
    }

    // Update subdomain (free change)
    store.subdomain = normalizedSubdomain;
    store.subdomainChangeCount = 1;
    await store.save();

    return {
      store,
      success: true,
    };
  }

  /**
   * Get subdomain change info for a store
   */
  async getSubdomainChangeInfo(ownerId: string): Promise<{
    currentSubdomain: string;
    changeCount: number;
    nextChangeCost: number;
    isFreeChangeAvailable: boolean;
  }> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const changeCount = store.subdomainChangeCount || 0;
    const isFreeChangeAvailable = changeCount === 0;
    const nextChangeCost = isFreeChangeAvailable ? 0 : 10;

    return {
      currentSubdomain: store.subdomain,
      changeCount,
      nextChangeCost,
      isFreeChangeAvailable,
    };
  }

  /**
   * Delete a store and update user's role
   */
  async deleteStore(storeId: string, user: UserDocument): Promise<void> {
    const store = await this.storeModel.findById(storeId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Verify ownership
    if (store.ownerId.toString() !== user._id.toString()) {
      throw new BadRequestException('You can only delete your own store');
    }

    // Delete the store
    await this.storeModel.findByIdAndDelete(storeId);

    // Update user: remove storeId and change role to USER only (remove SELLER)
    await this.userModel.findByIdAndUpdate(user._id, {
      $unset: { storeId: 1 },
      $set: { role: Role.USER },
    });
  }

  /**
   * Get store statistics for seller dashboard
   */
  async getStoreStats(ownerId: string): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    pendingOrders: number;
  }> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      return {
        totalProducts: 0,
        totalOrders: 0,
        totalRevenue: 0,
        pendingOrders: 0,
      };
    }

    const storeId = store._id;

    // Count total products
    const totalProducts = await this.productModel.countDocuments({
      store: storeId,
      isDeleted: { $ne: true },
    });

    // Count orders and calculate revenue
    const orders = await this.orderModel.find({
      'orderItems.storeId': storeId,
    });

    let totalRevenue = 0;
    let pendingOrders = 0;

    for (const order of orders) {
      // Sum revenue from order items belonging to this store
      for (const item of order.orderItems) {
        if (item.storeId?.toString() === storeId.toString()) {
          totalRevenue += item.price * item.qty;
        }
      }

      // Check if order has pending items for this store
      const isPending = [
        OrderStatus.PENDING,
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
      ].includes(order.status);
      if (isPending) {
        pendingOrders++;
      }
    }

    return {
      totalProducts,
      totalOrders: orders.length,
      totalRevenue,
      pendingOrders,
    };
  }

  /**
   * Get comprehensive analytics for seller dashboard
   */
  async getStoreAnalytics(
    ownerId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ): Promise<{
    overview: {
      totalRevenue: number;
      totalOrders: number;
      averageOrderValue: number;
      totalProductsSold: number;
      conversionRate: number;
    };
    revenueOverTime: Array<{
      date: string;
      revenue: number;
      orders: number;
    }>;
    orderStatusBreakdown: Record<string, number>;
    topProducts: Array<{
      productId: string;
      name: string;
      image?: string;
      totalSold: number;
      revenue: number;
    }>;
    customerInsights: {
      totalCustomers: number;
      repeatCustomers: number;
      newCustomers: number;
      repeatRate: number;
    };
    recentOrders: Array<{
      orderId: string;
      orderNumber: string;
      customerName: string;
      total: number;
      status: string;
      createdAt: Date;
    }>;
    periodComparison: {
      revenueChange: number;
      ordersChange: number;
      customersChange: number;
    };
  }> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      return {
        overview: {
          totalRevenue: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          totalProductsSold: 0,
          conversionRate: 0,
        },
        revenueOverTime: [],
        orderStatusBreakdown: {},
        topProducts: [],
        customerInsights: {
          totalCustomers: 0,
          repeatCustomers: 0,
          newCustomers: 0,
          repeatRate: 0,
        },
        recentOrders: [],
        periodComparison: {
          revenueChange: 0,
          ordersChange: 0,
          customersChange: 0,
        },
      };
    }

    const storeId = store._id;
    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 730 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
    }

    // Get all orders for this store in the period
    const orders = await this.orderModel.find({
      'orderItems.storeId': storeId,
      createdAt: { $gte: startDate },
    });

    // Get previous period orders for comparison
    const previousOrders = await this.orderModel.find({
      'orderItems.storeId': storeId,
      createdAt: { $gte: previousStartDate, $lt: startDate },
    });

    // Calculate overview metrics
    let totalRevenue = 0;
    let totalProductsSold = 0;
    const customerIds = new Set<string>();

    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.storeId?.toString() === storeId.toString()) {
          totalRevenue += item.price * item.qty;
          totalProductsSold += item.qty;
        }
      }
      if (order.user) {
        customerIds.add(order.user.toString());
      }
    }

    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate previous period metrics for comparison
    let previousRevenue = 0;
    const previousCustomerIds = new Set<string>();

    for (const order of previousOrders) {
      for (const item of order.orderItems) {
        if (item.storeId?.toString() === storeId.toString()) {
          previousRevenue += item.price * item.qty;
        }
      }
      if (order.user) {
        previousCustomerIds.add(order.user.toString());
      }
    }

    const previousOrderCount = previousOrders.length;

    // Revenue over time aggregation
    const revenueByDay = new Map<string, { revenue: number; orders: number }>();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const existing = revenueByDay.get(dateKey) || { revenue: 0, orders: 0 };

      for (const item of order.orderItems) {
        if (item.storeId?.toString() === storeId.toString()) {
          existing.revenue += item.price * item.qty;
        }
      }
      existing.orders += 1;
      revenueByDay.set(dateKey, existing);
    }

    const revenueOverTime = Array.from(revenueByDay.entries())
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orders: data.orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Order status breakdown
    const orderStatusBreakdown: Record<string, number> = {};
    for (const order of orders) {
      const status = order.status || 'pending';
      orderStatusBreakdown[status] = (orderStatusBreakdown[status] || 0) + 1;
    }

    // Top products - aggregate from order items
    const productSales = new Map<
      string,
      { name: string; image?: string; totalSold: number; revenue: number }
    >();

    for (const order of orders) {
      for (const item of order.orderItems) {
        if (item.storeId?.toString() === storeId.toString()) {
          const productId = item.product?.toString() || item.name;
          const existing = productSales.get(productId) || {
            name: item.name,
            image: item.image,
            totalSold: 0,
            revenue: 0,
          };
          existing.totalSold += item.qty;
          existing.revenue += item.price * item.qty;
          productSales.set(productId, existing);
        }
      }
    }

    const topProducts = Array.from(productSales.entries())
      .map(([productId, data]) => ({
        productId,
        name: data.name,
        image: data.image,
        totalSold: data.totalSold,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Customer insights - find repeat customers
    const allTimeOrders = await this.orderModel.find({
      'orderItems.storeId': storeId,
    });

    const customerOrderCount = new Map<string, number>();
    for (const order of allTimeOrders) {
      if (order.user) {
        const userId = order.user.toString();
        customerOrderCount.set(
          userId,
          (customerOrderCount.get(userId) || 0) + 1,
        );
      }
    }

    const totalCustomers = customerIds.size;
    let repeatCustomers = 0;
    let newCustomers = 0;

    for (const customerId of customerIds) {
      const orderCount = customerOrderCount.get(customerId) || 0;
      if (orderCount > 1) {
        repeatCustomers++;
      } else {
        newCustomers++;
      }
    }

    const repeatRate =
      totalCustomers > 0 ? (repeatCustomers / totalCustomers) * 100 : 0;

    // Recent orders (last 5)
    const recentOrders = orders
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5)
      .map((order) => {
        let orderTotal = 0;
        for (const item of order.orderItems) {
          if (item.storeId?.toString() === storeId.toString()) {
            orderTotal += item.price * item.qty;
          }
        }
        return {
          orderId: order._id.toString(),
          orderNumber: order.orderNumber || order._id.toString().slice(-8),
          customerName: order.shippingAddress?.recipientName || 'Customer',
          total: orderTotal,
          status: order.status,
          createdAt: order.createdAt,
        };
      });

    // Period comparison calculations
    const revenueChange =
      previousRevenue > 0
        ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
        : totalRevenue > 0
          ? 100
          : 0;

    const ordersChange =
      previousOrderCount > 0
        ? ((totalOrders - previousOrderCount) / previousOrderCount) * 100
        : totalOrders > 0
          ? 100
          : 0;

    const previousCustomersCount = previousCustomerIds.size;
    const customersChange =
      previousCustomersCount > 0
        ? ((totalCustomers - previousCustomersCount) / previousCustomersCount) *
          100
        : totalCustomers > 0
          ? 100
          : 0;

    return {
      overview: {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        totalProductsSold,
        conversionRate: 0, // Would need view tracking to calculate this
      },
      revenueOverTime,
      orderStatusBreakdown,
      topProducts,
      customerInsights: {
        totalCustomers,
        repeatCustomers,
        newCustomers,
        repeatRate,
      },
      recentOrders,
      periodComparison: {
        revenueChange,
        ordersChange,
        customersChange,
      },
    };
  }
}
