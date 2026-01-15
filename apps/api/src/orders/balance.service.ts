import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  User,
  UserDocument,
  Store,
  StoreDocument,
  Order,
  OrderDocument,
  Product,
  ProductDocument,
  BalanceTransaction,
  BalanceTransactionDocument,
  TransactionType,
} from '@sellit/api-database';
import { SiteSettingsService } from '../admin/site-settings.service';

@Injectable()
export class BalanceService {
  private readonly logger = new Logger(BalanceService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(BalanceTransaction.name)
    private transactionModel: Model<BalanceTransactionDocument>,
    private readonly siteSettingsService: SiteSettingsService,
  ) {}

  /**
   * Process earnings for an order after it's delivered
   * This deducts commissions and adds the final amount to seller's balance
   */
  async processOrderEarnings(order: OrderDocument): Promise<void> {
    this.logger.log(`Processing earnings for order: ${order._id}`);

    // Check if earnings have already been processed
    const existingTransaction = await this.transactionModel.findOne({
      orderId: order._id,
      type: TransactionType.EARNING,
    });

    if (existingTransaction) {
      this.logger.warn(
        `Earnings already processed for order ${order._id}. Skipping.`,
      );
      return;
    }

    // Get site settings for commission rates (with defaults if not set)
    const settings = await this.siteSettingsService.getSettings();
    const SITE_COMMISSION_RATE = settings.siteCommissionRate ?? 0.1; // Default 10%

    // Group order items by store
    const itemsByStore = new Map<string, typeof order.orderItems>();
    for (const item of order.orderItems) {
      const storeId = item.storeId.toString();
      if (!itemsByStore.has(storeId)) {
        itemsByStore.set(storeId, []);
      }
      itemsByStore.get(storeId)!.push(item);
    }

    // Process each store's earnings
    for (const [storeId, items] of itemsByStore) {
      const store = await this.storeModel.findById(storeId);
      if (!store) {
        this.logger.warn(
          `Store ${storeId} not found during earnings processing`,
        );
        continue;
      }

      const seller = await this.userModel.findById(store.ownerId);
      if (!seller) {
        this.logger.warn(`Seller not found for store ${storeId}`);
        continue;
      }

      // Calculate totals for this store's items
      const itemsTotalPrice = items.reduce(
        (sum, item) => sum + item.price * item.qty,
        0,
      );

      // Calculate site commission (10% of product price)
      // Note: Delivery fees are separate - paid by customer, go to courier
      const siteCommission = itemsTotalPrice * SITE_COMMISSION_RATE;
      const finalAmount = itemsTotalPrice - siteCommission;

      // Update seller's balance
      await this.userModel.findByIdAndUpdate(seller._id, {
        $inc: {
          balance: finalAmount,
          totalEarnings: finalAmount,
        },
      });

      // Create transaction record
      const transaction = new this.transactionModel({
        sellerId: seller._id,
        orderId: order._id,
        storeId: new Types.ObjectId(storeId),
        amount: finalAmount,
        type: TransactionType.EARNING,
        description: `Earnings from order #${order._id}`,
        commissionPercentage: SITE_COMMISSION_RATE * 100,
        commissionAmount: siteCommission,
        productPrice: itemsTotalPrice,
        finalAmount: finalAmount,
      });

      await transaction.save();

      this.logger.log(
        `Processed earnings for store ${storeId}: ${finalAmount} GEL (from ${itemsTotalPrice} GEL)`,
      );
    }

    // Process courier earnings if order was delivered by a ShopIt courier
    if (order.courierId) {
      await this.processCourierEarnings(order);
    }
  }

  /**
   * Process courier earnings for an order after it's delivered
   * Only for orders using ShopIt delivery (not seller self-delivery)
   *
   * Courier earnings = the shipping price paid by customer
   */
  private async processCourierEarnings(order: OrderDocument): Promise<void> {
    if (!order.courierId) {
      this.logger.warn(`No courier assigned to order ${order._id}`);
      return;
    }

    // Check if courier earnings have already been processed
    const existingCourierTransaction = await this.transactionModel.findOne({
      sellerId: order.courierId, // We use sellerId field for courier too (they're both users)
      orderId: order._id,
      type: TransactionType.EARNING,
    });

    if (existingCourierTransaction) {
      this.logger.warn(
        `Courier earnings already processed for order ${order._id}. Skipping.`,
      );
      return;
    }

    const courier = await this.userModel.findById(order.courierId);
    if (!courier) {
      this.logger.warn(`Courier ${order.courierId} not found`);
      return;
    }

    // Get courier earnings percentage from settings (default 80%)
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    // Courier receives a percentage of the shipping price
    const shippingPrice = order.shippingPrice;
    const courierEarnings =
      Math.round(shippingPrice * courierEarningsPercentage * 100) / 100;
    const platformFee =
      Math.round((shippingPrice - courierEarnings) * 100) / 100;

    if (courierEarnings <= 0) {
      this.logger.log(
        `No shipping fee for order ${order._id}, skipping courier earnings`,
      );
      return;
    }

    // Update courier's balance
    await this.userModel.findByIdAndUpdate(courier._id, {
      $inc: {
        balance: courierEarnings,
        totalEarnings: courierEarnings,
      },
    });

    // Create transaction record for courier
    // Use the first store from order items (couriers deliver for stores)
    const storeId = order.orderItems[0]?.storeId;
    const transaction = new this.transactionModel({
      sellerId: courier._id, // Using sellerId field for courier (User model is shared)
      orderId: order._id,
      storeId: storeId, // Required field - use store from order
      amount: courierEarnings,
      type: TransactionType.EARNING,
      description: `Delivery earnings from order #${order._id}`,
      productPrice: shippingPrice, // Store original shipping price
      commissionPercentage: (1 - courierEarningsPercentage) * 100, // Platform fee %
      commissionAmount: platformFee,
      finalAmount: courierEarnings,
    });

    await transaction.save();

    this.logger.log(
      `Processed courier earnings for order ${order._id}: ${courierEarnings} GEL (${courierEarningsPercentage * 100}% of ${shippingPrice} GEL)`,
    );
  }

  /**
   * Get seller's balance summary including waiting earnings
   * Waiting earnings = money from orders that are paid but not yet delivered
   */
  async getSellerBalance(sellerId: string): Promise<{
    balance: number;
    totalEarnings: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
    waitingEarnings: number;
  }> {
    const user = await this.userModel
      .findById(sellerId)
      .select('balance totalEarnings pendingWithdrawals totalWithdrawn');

    if (!user) {
      return {
        balance: 0,
        totalEarnings: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        waitingEarnings: 0,
      };
    }

    // Calculate waiting earnings from paid but not delivered orders
    const waitingEarnings = await this.calculateWaitingEarnings(sellerId);

    return {
      balance: user.balance || 0,
      totalEarnings: user.totalEarnings || 0,
      pendingWithdrawals: user.pendingWithdrawals || 0,
      totalWithdrawn: user.totalWithdrawn || 0,
      waitingEarnings,
    };
  }

  /**
   * Get courier's balance summary including waiting earnings
   * Waiting earnings = money from orders assigned to courier but not yet delivered
   */
  async getCourierBalance(courierId: string): Promise<{
    balance: number;
    totalEarnings: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
    waitingEarnings: number;
  }> {
    const user = await this.userModel
      .findById(courierId)
      .select('balance totalEarnings pendingWithdrawals totalWithdrawn');

    if (!user) {
      return {
        balance: 0,
        totalEarnings: 0,
        pendingWithdrawals: 0,
        totalWithdrawn: 0,
        waitingEarnings: 0,
      };
    }

    // Calculate waiting earnings from assigned but not delivered orders
    const waitingEarnings =
      await this.calculateCourierWaitingEarnings(courierId);

    return {
      balance: user.balance || 0,
      totalEarnings: user.totalEarnings || 0,
      pendingWithdrawals: user.pendingWithdrawals || 0,
      totalWithdrawn: user.totalWithdrawn || 0,
      waitingEarnings,
    };
  }

  /**
   * Calculate waiting earnings for courier from assigned but not delivered orders
   */
  private async calculateCourierWaitingEarnings(
    courierId: string,
  ): Promise<number> {
    // Get courier earnings percentage from settings (default 80%)
    const settings = await this.siteSettingsService.getSettings();
    const courierEarningsPercentage = settings.courierEarningsPercentage ?? 0.8;

    // Find orders assigned to this courier that are not yet delivered
    // Statuses: ready_for_delivery (just assigned), shipped (in transit)
    const pendingStatuses = ['ready_for_delivery', 'shipped'];

    const orders = await this.orderModel.find({
      courierId: new Types.ObjectId(courierId),
      status: { $in: pendingStatuses },
    });

    if (orders.length === 0) {
      return 0;
    }

    // Sum up expected earnings (shipping price * earnings percentage)
    let totalWaitingEarnings = 0;
    for (const order of orders) {
      const courierEarnings = order.shippingPrice * courierEarningsPercentage;
      totalWaitingEarnings += courierEarnings;
    }

    return Math.round(totalWaitingEarnings * 100) / 100;
  }

  /**
   * Debug method to see what's happening with balance calculation
   */
  async debugBalance(sellerId: string): Promise<object> {
    const user = await this.userModel
      .findById(sellerId)
      .select('email firstName lastName balance totalEarnings');
    const stores = await this.storeModel
      .find({ ownerId: new Types.ObjectId(sellerId) })
      .select('_id name courierType');

    if (stores.length === 0) {
      return { error: 'No stores found', sellerId, user };
    }

    const storeIds = stores.map((s) => s._id);
    const pendingDeliveryStatuses = [
      'paid',
      'processing',
      'ready_for_delivery',
      'shipped',
    ];

    // Get ALL orders for these stores
    const allOrders = await this.orderModel
      .find({
        'orderItems.storeId': { $in: storeIds },
      })
      .select(
        '_id status isPaid paidAt isDelivered itemsPrice shippingPrice totalPrice orderItems.storeId orderItems.price orderItems.qty',
      );

    // Get matching orders (paid, not delivered)
    const matchingOrders = await this.orderModel
      .find({
        'orderItems.storeId': { $in: storeIds },
        isPaid: true,
        status: { $in: pendingDeliveryStatuses },
      })
      .select(
        '_id status isPaid paidAt isDelivered itemsPrice shippingPrice totalPrice',
      );

    const waitingEarnings = await this.calculateWaitingEarnings(sellerId);

    return {
      sellerId,
      user: user
        ? {
            id: user._id.toString(),
            email: user.email,
            balance: user.balance,
            totalEarnings: user.totalEarnings,
          }
        : null,
      stores: stores.map((s) => ({
        id: s._id.toString(),
        name: s.name,
        courierType: s.courierType,
      })),
      allOrdersCount: allOrders.length,
      allOrders: allOrders.map((o) => ({
        id: o._id.toString(),
        status: o.status,
        isPaid: o.isPaid,
        paidAt: o.paidAt,
        isDelivered: o.isDelivered,
        itemsPrice: o.itemsPrice,
        shippingPrice: o.shippingPrice,
        totalPrice: o.totalPrice,
      })),
      matchingOrdersCount: matchingOrders.length,
      matchingOrders: matchingOrders.map((o) => ({
        id: o._id.toString(),
        status: o.status,
        isPaid: o.isPaid,
      })),
      calculatedWaitingEarnings: waitingEarnings,
    };
  }

  /**
   * Calculate earnings from orders that are paid but not yet delivered
   * These are orders where the seller will receive money once they're delivered
   *
   * NOTE: We use status-based filtering instead of isDelivered flag because:
   * 1. The status field is the source of truth for order state
   * 2. isDelivered is a redundant field that can get out of sync
   * 3. Status already tells us if order is delivered or not
   */
  private async calculateWaitingEarnings(sellerId: string): Promise<number> {
    // Get seller's store(s)
    const stores = await this.storeModel.find({
      ownerId: new Types.ObjectId(sellerId),
    });
    if (stores.length === 0) {
      this.logger.debug(`No stores found for seller ${sellerId}`);
      return 0;
    }

    const storeIds = stores.map((s) => s._id);
    this.logger.debug(
      `Found ${stores.length} stores for seller: ${storeIds.map((id) => id.toString()).join(', ')}`,
    );

    // Find all orders that are paid but not yet delivered
    // Use status to determine delivery state (not isDelivered flag which can be out of sync)
    // Statuses that mean "paid but not delivered": paid, processing, ready_for_delivery, shipped
    const pendingDeliveryStatuses = [
      'paid',
      'processing',
      'ready_for_delivery',
      'shipped',
    ];

    // Query orders that contain items from any of the seller's stores
    // Note: We check isPaid=true for payment confirmation, but use status for delivery state
    const orders = await this.orderModel.find({
      'orderItems.storeId': { $in: storeIds },
      isPaid: true,
      status: { $in: pendingDeliveryStatuses },
    });

    this.logger.debug(
      `Found ${orders.length} pending delivery orders for seller's stores`,
    );

    if (orders.length === 0) {
      return 0;
    }

    // Get site settings for commission rates (with defaults if not set)
    const settings = await this.siteSettingsService.getSettings();
    const SITE_COMMISSION_RATE = settings.siteCommissionRate ?? 0.1; // Default 10%

    let totalWaitingEarnings = 0;

    // Calculate expected earnings for each order
    for (const order of orders) {
      // Group items by store (for this seller's stores only)
      for (const store of stores) {
        const storeIdStr = store._id.toString();
        const storeItems = order.orderItems.filter(
          (item) => item.storeId?.toString() === storeIdStr,
        );

        if (storeItems.length === 0) continue;

        // Calculate totals for this store's items
        const itemsTotalPrice = storeItems.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );

        // Calculate site commission (10% of product price)
        // Note: Delivery fees are separate - paid by customer, go to courier
        const siteCommission = itemsTotalPrice * SITE_COMMISSION_RATE;
        const finalAmount = itemsTotalPrice - siteCommission;

        this.logger.debug(
          `Order ${order._id}: items price=${itemsTotalPrice}, final amount=${finalAmount}`,
        );
        totalWaitingEarnings += finalAmount;
      }
    }

    this.logger.debug(`Total waiting earnings: ${totalWaitingEarnings}`);
    return Math.round(totalWaitingEarnings * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get seller's transaction history
   */
  async getSellerTransactions(
    sellerId: string,
    page = 1,
    limit = 10,
  ): Promise<{
    transactions: BalanceTransactionDocument[];
    total: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({ sellerId: new Types.ObjectId(sellerId) })
        .populate('orderId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.transactionModel.countDocuments({
        sellerId: new Types.ObjectId(sellerId),
      }),
    ]);

    return {
      transactions,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Request withdrawal (simplified - no BOG integration yet)
   */
  async requestWithdrawal(
    sellerId: string,
    storeId: string,
    amount: number,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Processing withdrawal request: seller=${sellerId}, amount=${amount}`,
    );

    // Get minimum withdrawal from settings
    const minWithdrawal =
      await this.siteSettingsService.getMinimumWithdrawalAmount();

    // Minimum withdrawal
    if (amount < minWithdrawal) {
      return {
        success: false,
        message: `Minimum withdrawal amount is ${minWithdrawal} GEL`,
      };
    }

    const user = await this.userModel.findById(sellerId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    if ((user.balance || 0) < amount) {
      return { success: false, message: 'Insufficient balance' };
    }

    // Check if bank account is set
    const store = await this.storeModel.findById(storeId);
    if (!store?.bankAccountNumber) {
      return {
        success: false,
        message: 'Please add a bank account number in store settings',
      };
    }

    // Deduct from balance and add to pending
    await this.userModel.findByIdAndUpdate(sellerId, {
      $inc: {
        balance: -amount,
        pendingWithdrawals: amount,
      },
    });

    // Create pending withdrawal transaction
    const transaction = new this.transactionModel({
      sellerId: new Types.ObjectId(sellerId),
      storeId: new Types.ObjectId(storeId),
      amount: -amount,
      type: TransactionType.WITHDRAWAL_PENDING,
      description: `Withdrawal request to ${store.bankAccountNumber}`,
      bankAccountNumber: store.bankAccountNumber,
      finalAmount: -amount,
    });

    await transaction.save();

    this.logger.log(
      `Withdrawal request created: ${amount} GEL for seller ${sellerId}`,
    );

    return {
      success: true,
      message:
        'Withdrawal request submitted. Funds will be transferred within 1-3 business days.',
    };
  }

  /**
   * Process completed withdrawal (called by admin or automated BOG callback)
   */
  async completeWithdrawal(transactionId: string): Promise<void> {
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.type !== TransactionType.WITHDRAWAL_PENDING) {
      throw new Error('Transaction is not a pending withdrawal');
    }

    const amount = Math.abs(transaction.amount);

    // Update user balance
    await this.userModel.findByIdAndUpdate(transaction.sellerId, {
      $inc: {
        pendingWithdrawals: -amount,
        totalWithdrawn: amount,
      },
    });

    // Update transaction status
    transaction.type = TransactionType.WITHDRAWAL_COMPLETED;
    transaction.description += ' - Completed';
    await transaction.save();

    this.logger.log(`Withdrawal completed: ${transactionId}`);
  }

  /**
   * Reject/cancel a withdrawal (returns funds to balance)
   */
  async rejectWithdrawal(
    transactionId: string,
    reason?: string,
  ): Promise<void> {
    const transaction = await this.transactionModel.findById(transactionId);
    if (!transaction) {
      throw new Error('Transaction not found');
    }

    if (transaction.type !== TransactionType.WITHDRAWAL_PENDING) {
      throw new Error('Transaction is not a pending withdrawal');
    }

    const amount = Math.abs(transaction.amount);

    // Return funds to balance
    await this.userModel.findByIdAndUpdate(transaction.sellerId, {
      $inc: {
        balance: amount,
        pendingWithdrawals: -amount,
      },
    });

    // Update transaction status
    transaction.type = TransactionType.WITHDRAWAL_REJECTED;
    transaction.description += ` - Rejected${reason ? ': ' + reason : ''}`;
    await transaction.save();

    this.logger.log(`Withdrawal rejected: ${transactionId}`);
  }
}
