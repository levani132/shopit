import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  User,
  UserDocument,
  Order,
  OrderDocument,
  CourierRoute,
  CourierRouteDocument,
} from '@shopit/api-database';
import { Role } from '@shopit/constants';

@Injectable()
export class CourierAdminService {
  private readonly _logger = new Logger(CourierAdminService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(CourierRoute.name)
    private readonly courierRouteModel: Model<CourierRouteDocument>,
  ) {}

  /**
   * Get analytics dashboard data for courier admin
   */
  async getAnalytics() {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
    const startOfDay = new Date(now.setHours(0, 0, 0, 0));

    // Get all couriers
    const allCouriers = await this.userModel
      .find({
        $or: [{ role: Role.COURIER }, { role: { $bitsAllSet: Role.COURIER } }],
      })
      .lean();

    // Count courier statuses
    const totalCouriers = allCouriers.length;

    // Get active routes to determine busy couriers
    const activeRoutes = await this.courierRouteModel
      .find({
        status: { $in: ['assigned', 'in_progress'] },
      })
      .lean();

    const busyCourierIds = new Set(
      activeRoutes.map((r) => r.courierId?.toString()),
    );
    const availableCouriers = allCouriers.filter(
      (c) => !busyCourierIds.has(c._id.toString()) && c.isCourierApproved,
    ).length;
    const busyCouriers = busyCourierIds.size;
    const offlineCouriers = totalCouriers - availableCouriers - busyCouriers;

    // Get delivery orders
    const pendingOrders = await this.orderModel.countDocuments({
      status: { $in: ['paid', 'processing', 'ready_for_delivery'] },
    });

    const inProgressOrders = await this.orderModel.countDocuments({
      status: { $in: ['assigned_to_courier', 'picked_up'] },
    });

    // Get urgent orders (overdue or approaching deadline)
    const overdueOrders = await this.orderModel.countDocuments({
      status: {
        $in: [
          'paid',
          'processing',
          'ready_for_delivery',
          'assigned_to_courier',
          'picked_up',
        ],
      },
      deliveryDeadline: { $lt: now },
    });

    const approachingDeadlineOrders = await this.orderModel.countDocuments({
      status: {
        $in: [
          'paid',
          'processing',
          'ready_for_delivery',
          'assigned_to_courier',
          'picked_up',
        ],
      },
      deliveryDeadline: { $gte: now, $lt: oneHourFromNow },
    });

    // Get on-time rate (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const deliveredOrders = await this.orderModel
      .find({
        status: 'delivered',
        deliveredAt: { $gte: thirtyDaysAgo },
      })
      .lean();

    const onTimeDeliveries = deliveredOrders.filter((order) => {
      if (!order.deliveryDeadline || !order.deliveredAt) return true;
      return new Date(order.deliveredAt) <= new Date(order.deliveryDeadline);
    }).length;

    const onTimeRate =
      deliveredOrders.length > 0
        ? Math.round((onTimeDeliveries / deliveredOrders.length) * 100)
        : 100;

    // Calculate average delivery time (in minutes)
    const avgDeliveryTime =
      deliveredOrders.length > 0
        ? Math.round(
            deliveredOrders.reduce((sum, order) => {
              if (order.courierAssignedAt && order.deliveredAt) {
                return (
                  sum +
                  (new Date(order.deliveredAt).getTime() -
                    new Date(order.courierAssignedAt).getTime()) /
                    (1000 * 60)
                );
              }
              return sum;
            }, 0) / deliveredOrders.length,
          )
        : 0;

    // Get urgent orders list
    const urgentOrdersList = await this.orderModel
      .find({
        status: {
          $in: [
            'paid',
            'processing',
            'ready_for_delivery',
            'assigned_to_courier',
            'picked_up',
          ],
        },
        $or: [
          { deliveryDeadline: { $lt: now } },
          { deliveryDeadline: { $gte: now, $lt: oneHourFromNow } },
        ],
      })
      .populate('courierId', 'firstName lastName email phoneNumber')
      .sort({ deliveryDeadline: 1 })
      .limit(10)
      .lean();

    // Get top couriers by deliveries this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const topCouriers = await this.orderModel.aggregate([
      {
        $match: {
          status: 'delivered',
          deliveredAt: { $gte: startOfMonth },
          courierId: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$courierId',
          deliveries: { $sum: 1 },
          onTimeDeliveries: {
            $sum: {
              $cond: [{ $lte: ['$deliveredAt', '$deliveryDeadline'] }, 1, 0],
            },
          },
          totalDeliveryTime: {
            $sum: {
              $subtract: ['$deliveredAt', '$courierAssignedAt'],
            },
          },
        },
      },
      { $sort: { deliveries: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'courierInfo',
        },
      },
      { $unwind: '$courierInfo' },
      {
        $project: {
          _id: 1,
          name: {
            $concat: ['$courierInfo.firstName', ' ', '$courierInfo.lastName'],
          },
          deliveries: 1,
          onTimeRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$onTimeDeliveries', '$deliveries'] },
                  100,
                ],
              },
              0,
            ],
          },
          avgDeliveryTime: {
            $round: [
              {
                $divide: [
                  '$totalDeliveryTime',
                  { $multiply: ['$deliveries', 60000] },
                ],
              },
              0,
            ],
          },
        },
      },
    ]);

    // Get courier status summary
    const completedTodayCount = await this.orderModel.countDocuments({
      status: 'delivered',
      deliveredAt: { $gte: startOfDay },
    });

    return {
      stats: {
        totalCouriers,
        availableCouriers,
        busyCouriers,
        offlineCouriers,
        pendingOrders,
        inProgressOrders,
        overdueOrders,
        approachingDeadlineOrders,
        onTimeRate,
        avgDeliveryTime,
      },
      urgentOrders: urgentOrdersList.map((order) => ({
        id: order._id,
        orderNumber: order._id.toString().slice(-6).toUpperCase(),
        deadline: order.deliveryDeadline,
        status: order.status,
        isOverdue:
          order.deliveryDeadline && new Date(order.deliveryDeadline) < now,
        courier: order.courierId,
      })),
      topCouriers,
      statusSummary: {
        available: availableCouriers,
        busy: busyCouriers,
        inactive: offlineCouriers,
        completedToday: completedTodayCount,
      },
    };
  }

  /**
   * Get list of all couriers with pagination and filters
   */
  async getCouriers(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    sortBy?: string;
  }) {
    const { page = 1, limit = 20, search, status, sortBy = 'name' } = query;

    const filter: any = {
      $or: [{ role: Role.COURIER }, { role: { $bitsAllSet: Role.COURIER } }],
    };

    if (search) {
      filter.$and = [
        {
          $or: [
            { firstName: { $regex: search, $options: 'i' } },
            { lastName: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { phoneNumber: { $regex: search, $options: 'i' } },
          ],
        },
      ];
    }

    // Get all couriers matching filter
    const couriers = await this.userModel
      .find(filter)
      .sort({ [sortBy]: 1 })
      .lean();

    // Get active routes for each courier
    const activeRoutes = await this.courierRouteModel
      .find({
        status: { $in: ['assigned', 'in_progress'] },
      })
      .lean();

    const busyCourierIds = new Set(
      activeRoutes.map((r) => r.courierId?.toString()),
    );

    // Calculate performance for each courier
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const courierIds = couriers.map((c) => c._id);

    const deliveryStats = await this.orderModel.aggregate([
      {
        $match: {
          courierId: { $in: courierIds },
          status: 'delivered',
          deliveredAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$courierId',
          totalDeliveries: { $sum: 1 },
          onTimeDeliveries: {
            $sum: {
              $cond: [{ $lte: ['$deliveredAt', '$deliveryDeadline'] }, 1, 0],
            },
          },
          lastDeliveryAt: { $max: '$deliveredAt' },
        },
      },
    ]);

    const statsMap = new Map(deliveryStats.map((s) => [s._id.toString(), s]));

    // Enrich couriers with status and performance
    let enrichedCouriers = couriers.map((courier) => {
      const isBusy = busyCourierIds.has(courier._id.toString());
      const stats = statsMap.get(courier._id.toString());
      const activeDeliveries = activeRoutes.filter(
        (r) => r.courierId?.toString() === courier._id.toString(),
      ).length;

      return {
        _id: courier._id,
        name: `${courier.firstName} ${courier.lastName}`,
        email: courier.email,
        phone: courier.phoneNumber,
        status: isBusy
          ? 'busy'
          : courier.isCourierApproved
            ? 'available'
            : 'offline',
        isApproved: courier.isCourierApproved,
        activeDeliveries,
        totalDeliveries: stats?.totalDeliveries || 0,
        onTimeRate: stats
          ? Math.round((stats.onTimeDeliveries / stats.totalDeliveries) * 100)
          : 0,
        lastActive: stats?.lastDeliveryAt || courier.lastActivity || null,
        createdAt: (courier as any).createdAt,
      };
    });

    // Apply status filter after enrichment
    if (status && status !== 'all') {
      enrichedCouriers = enrichedCouriers.filter((c) => c.status === status);
    }

    // Apply sorting
    if (sortBy === 'deliveries') {
      enrichedCouriers.sort((a, b) => b.totalDeliveries - a.totalDeliveries);
    } else if (sortBy === 'onTimeRate') {
      enrichedCouriers.sort((a, b) => b.onTimeRate - a.onTimeRate);
    } else if (sortBy === 'lastActive') {
      enrichedCouriers.sort((a, b) => {
        if (!a.lastActive) return 1;
        if (!b.lastActive) return -1;
        return (
          new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
        );
      });
    }

    const total = enrichedCouriers.length;
    const skip = (page - 1) * limit;
    const paginatedCouriers = enrichedCouriers.slice(skip, skip + limit);

    return {
      couriers: paginatedCouriers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get all delivery orders with filters
   */
  async getOrders(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    urgentOnly?: boolean;
    dateFilter?: string;
  }) {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      urgentOnly = false,
      dateFilter,
    } = query;

    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    const filter: any = {
      status: {
        $in: [
          'paid',
          'processing',
          'ready_for_delivery',
          'assigned_to_courier',
          'picked_up',
          'delivered',
        ],
      },
    };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      // Search by _id (order ID) since orderNumber field doesn't exist
      filter.$or = [{ _id: { $regex: search, $options: 'i' } }];
    }

    if (urgentOnly) {
      filter.$or = [
        { deliveryDeadline: { $lt: now } },
        { deliveryDeadline: { $gte: now, $lt: oneHourFromNow } },
      ];
    }

    // Date filter
    if (dateFilter) {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      switch (dateFilter) {
        case 'today':
          filter.createdAt = { $gte: startOfDay };
          break;
        case 'yesterday': {
          const yesterday = new Date(startOfDay);
          yesterday.setDate(yesterday.getDate() - 1);
          filter.createdAt = { $gte: yesterday, $lt: startOfDay };
          break;
        }
        case 'thisWeek': {
          const startOfWeek = new Date(startOfDay);
          startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
          filter.createdAt = { $gte: startOfWeek };
          break;
        }
        case 'thisMonth': {
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          filter.createdAt = { $gte: startOfMonth };
          break;
        }
      }
    }

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .populate('courierId', 'firstName lastName email phoneNumber')
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.orderModel.countDocuments(filter),
    ]);

    // Get quick stats
    const [pendingCount, inProgressCount, overdueCount, deliveredTodayCount] =
      await Promise.all([
        this.orderModel.countDocuments({
          status: { $in: ['paid', 'processing', 'ready_for_delivery'] },
        }),
        this.orderModel.countDocuments({
          status: { $in: ['assigned_to_courier', 'picked_up'] },
        }),
        this.orderModel.countDocuments({
          status: {
            $in: [
              'paid',
              'processing',
              'ready_for_delivery',
              'assigned_to_courier',
              'picked_up',
            ],
          },
          deliveryDeadline: { $lt: now },
        }),
        this.orderModel.countDocuments({
          status: 'delivered',
          deliveredAt: { $gte: new Date(now.setHours(0, 0, 0, 0)) },
        }),
      ]);

    return {
      orders: orders.map((order) => {
        const userDoc = order.user as any;
        const courierDoc = order.courierId as any;
        return {
          _id: order._id,
          orderNumber: order._id.toString().slice(-6).toUpperCase(),
          status: order.status,
          customer: userDoc
            ? { name: `${userDoc.firstName} ${userDoc.lastName}` }
            : order.guestInfo
              ? { name: order.guestInfo.fullName }
              : { name: 'Guest' },
          courier: courierDoc
            ? { name: `${courierDoc.firstName} ${courierDoc.lastName}` }
            : null,
          total: order.totalPrice,
          deliveryDeadline: order.deliveryDeadline,
          isOverdue:
            order.deliveryDeadline && new Date(order.deliveryDeadline) < now,
          isApproachingDeadline:
            order.deliveryDeadline &&
            new Date(order.deliveryDeadline) >= now &&
            new Date(order.deliveryDeadline) < oneHourFromNow,
          createdAt: (order as any).createdAt,
          deliveredAt: order.deliveredAt,
          shippingAddress: order.shippingDetails,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      quickStats: {
        pending: pendingCount,
        inProgress: inProgressCount,
        overdue: overdueCount,
        deliveredToday: deliveredTodayCount,
      },
    };
  }

  /**
   * Get detailed information about a specific courier
   */
  async getCourierDetails(courierId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get courier profile
    const courier = await this.userModel.findById(courierId).lean();
    if (!courier) {
      throw new Error('Courier not found');
    }

    // Get all delivered orders by this courier
    const [
      totalDelivered,
      deliveredToday,
      deliveredThisWeek,
      deliveredThisMonth,
      activeDeliveries,
      recentDeliveries,
      allDeliveriesForStats,
    ] = await Promise.all([
      // Total delivered
      this.orderModel.countDocuments({
        courierId: courierId,
        status: 'delivered',
      }),
      // Delivered today
      this.orderModel.countDocuments({
        courierId: courierId,
        status: 'delivered',
        deliveredAt: { $gte: startOfDay },
      }),
      // Delivered this week
      this.orderModel.countDocuments({
        courierId: courierId,
        status: 'delivered',
        deliveredAt: { $gte: startOfWeek },
      }),
      // Delivered this month
      this.orderModel.countDocuments({
        courierId: courierId,
        status: 'delivered',
        deliveredAt: { $gte: startOfMonth },
      }),
      // Active deliveries
      this.orderModel.countDocuments({
        courierId: courierId,
        status: { $in: ['assigned_to_courier', 'picked_up'] },
      }),
      // Recent deliveries (last 10)
      this.orderModel
        .find({ courierId: courierId })
        .populate('user', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      // All deliveries in last 30 days for stats
      this.orderModel
        .find({
          courierId: courierId,
          status: 'delivered',
          deliveredAt: { $gte: thirtyDaysAgo },
        })
        .lean(),
    ]);

    // Calculate on-time rate
    let onTimeCount = 0;
    let totalDeliveryTime = 0;
    let validDeliveryCount = 0;

    for (const order of allDeliveriesForStats) {
      if (order.deliveryDeadline && order.deliveredAt) {
        if (new Date(order.deliveredAt) <= new Date(order.deliveryDeadline)) {
          onTimeCount++;
        }
      }
      if (order.courierAssignedAt && order.deliveredAt) {
        const deliveryTime =
          new Date(order.deliveredAt).getTime() -
          new Date(order.courierAssignedAt).getTime();
        totalDeliveryTime += deliveryTime;
        validDeliveryCount++;
      }
    }

    const onTimeRate =
      allDeliveriesForStats.length > 0
        ? Math.round((onTimeCount / allDeliveriesForStats.length) * 100)
        : 0;

    const averageDeliveryTimeMinutes =
      validDeliveryCount > 0
        ? Math.round(totalDeliveryTime / validDeliveryCount / 1000 / 60)
        : 0;

    // Get deliveries per day for last 7 days chart
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const dailyDeliveries = await this.orderModel.aggregate([
      {
        $match: {
          courierId: courierId,
          status: 'delivered',
          deliveredAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$deliveredAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Determine status
    const activeRoute = await this.courierRouteModel.findOne({
      courierId: courierId,
      status: { $in: ['assigned', 'in_progress'] },
    });

    let status: 'available' | 'busy' | 'offline' = 'available';
    if (activeRoute) {
      status = 'busy';
    } else if (!courier.isCourierApproved) {
      status = 'offline';
    }

    return {
      profile: {
        _id: courier._id,
        firstName: courier.firstName,
        lastName: courier.lastName,
        email: courier.email,
        phoneNumber: courier.phoneNumber,
        isApproved: courier.isCourierApproved,
        createdAt: (courier as any).createdAt,
        lastActivity: courier.lastActivity,
        status,
      },
      stats: {
        totalDelivered,
        deliveredToday,
        deliveredThisWeek,
        deliveredThisMonth,
        activeDeliveries,
        onTimeRate,
        averageDeliveryTimeMinutes,
      },
      recentDeliveries: recentDeliveries.map((order) => {
        const userDoc = order.user as any;
        return {
          _id: order._id,
          orderNumber: order._id.toString().slice(-6).toUpperCase(),
          status: order.status,
          customer: userDoc
            ? `${userDoc.firstName} ${userDoc.lastName}`
            : order.guestInfo?.fullName || 'Guest',
          total: order.totalPrice,
          createdAt: (order as any).createdAt,
          deliveredAt: order.deliveredAt,
          isOnTime:
            order.deliveryDeadline && order.deliveredAt
              ? new Date(order.deliveredAt) <= new Date(order.deliveryDeadline)
              : null,
        };
      }),
      dailyDeliveriesChart: dailyDeliveries.map((d) => ({
        date: d._id,
        count: d.count,
      })),
    };
  }

  /**
   * Get detailed information about a specific order
   */
  async getOrderDetails(orderId: string) {
    const now = new Date();

    const order = await this.orderModel
      .findById(orderId)
      .populate('user', 'firstName lastName email phoneNumber')
      .populate('courierId', 'firstName lastName email phoneNumber')
      .lean();

    if (!order) {
      throw new Error('Order not found');
    }

    const userDoc = order.user as any;
    const courierDoc = order.courierId as any;

    return {
      _id: order._id,
      orderNumber: order._id.toString().slice(-6).toUpperCase(),
      status: order.status,
      createdAt: (order as any).createdAt,
      updatedAt: (order as any).updatedAt,
      totalPrice: order.totalPrice,
      deliveryDeadline: order.deliveryDeadline,
      deliveredAt: order.deliveredAt,
      courierAssignedAt: order.courierAssignedAt,
      pickedUpAt: order.pickedUpAt,
      isOverdue:
        order.deliveryDeadline &&
        new Date(order.deliveryDeadline) < now &&
        order.status !== 'delivered',
      user: userDoc
        ? {
            _id: userDoc._id,
            firstName: userDoc.firstName,
            lastName: userDoc.lastName,
            email: userDoc.email,
            phoneNumber: userDoc.phoneNumber,
          }
        : null,
      guestInfo: order.guestInfo
        ? {
            fullName: order.guestInfo.fullName,
            email: order.guestInfo.email,
            phoneNumber: order.guestInfo.phoneNumber,
          }
        : null,
      courierId: courierDoc
        ? {
            _id: courierDoc._id,
            firstName: courierDoc.firstName,
            lastName: courierDoc.lastName,
            email: courierDoc.email,
            phoneNumber: courierDoc.phoneNumber,
          }
        : null,
      shippingDetails: order.shippingDetails,
      items:
        order.orderItems?.map((item) => ({
          productId: item.productId,
          name: item.name,
          quantity: item.qty,
          price: item.price,
          image: item.image,
          variant: item.variantAttributes
            ?.map((attr) => `${attr.attributeName}: ${attr.value}`)
            .join(', '),
        })) || [],
      deliveryNotes:
        ((order.shippingDetails as unknown as Record<string, unknown>)
          ?.notes as string) || '',
    };
  }
}
