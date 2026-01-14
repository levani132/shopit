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

    // Get site settings for commission rates
    const settings = await this.siteSettingsService.getSettings();
    const SITE_COMMISSION_RATE = settings.siteCommissionRate;
    const DELIVERY_COMMISSION_RATE = settings.deliveryCommissionRate;
    const DELIVERY_COMMISSION_MIN = settings.deliveryCommissionMin;
    const DELIVERY_COMMISSION_MAX = settings.deliveryCommissionMax;

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
        this.logger.warn(`Store ${storeId} not found during earnings processing`);
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

      // Calculate commissions
      const siteCommission = itemsTotalPrice * SITE_COMMISSION_RATE;

      // Delivery commission (only for ShopIt courier)
      let deliveryCommission = 0;
      if (store.courierType !== 'seller') {
        // ShopIt courier - calculate based on configurable rates
        deliveryCommission = Math.min(
          Math.max(itemsTotalPrice * DELIVERY_COMMISSION_RATE, DELIVERY_COMMISSION_MIN),
          DELIVERY_COMMISSION_MAX,
        );
      }

      const totalCommissions = siteCommission + deliveryCommission;
      // Ensure seller never gets negative earnings
      // If commissions exceed item price, seller gets 0 (commissions are capped at item price)
      const finalAmount = Math.max(0, itemsTotalPrice - totalCommissions);

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
        deliveryCommissionAmount: deliveryCommission,
        productPrice: itemsTotalPrice,
        finalAmount: finalAmount,
      });

      await transaction.save();

      this.logger.log(
        `Processed earnings for store ${storeId}: ${finalAmount} GEL (from ${itemsTotalPrice} GEL)`,
      );
    }
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
   * Calculate earnings from orders that are paid but not yet delivered
   * These are orders where the seller will receive money once they're delivered
   */
  private async calculateWaitingEarnings(sellerId: string): Promise<number> {
    // Get seller's store(s)
    const stores = await this.storeModel.find({ ownerId: new Types.ObjectId(sellerId) });
    if (stores.length === 0) {
      return 0;
    }

    const storeIds = stores.map(s => s._id);

    // Find all orders that are paid but not delivered
    // Status can be: paid, processing, ready_for_delivery, shipped
    const pendingDeliveryStatuses = ['paid', 'processing', 'ready_for_delivery', 'shipped'];
    
    const orders = await this.orderModel.find({
      'orderItems.storeId': { $in: storeIds },
      isPaid: true,
      isDelivered: false,
      status: { $in: pendingDeliveryStatuses },
    });

    if (orders.length === 0) {
      return 0;
    }

    // Get site settings for commission rates
    const settings = await this.siteSettingsService.getSettings();
    const SITE_COMMISSION_RATE = settings.siteCommissionRate;
    const DELIVERY_COMMISSION_RATE = settings.deliveryCommissionRate;
    const DELIVERY_COMMISSION_MIN = settings.deliveryCommissionMin;
    const DELIVERY_COMMISSION_MAX = settings.deliveryCommissionMax;

    let totalWaitingEarnings = 0;

    // Calculate expected earnings for each order
    for (const order of orders) {
      // Group items by store (for this seller's stores only)
      for (const store of stores) {
        const storeItems = order.orderItems.filter(
          item => item.storeId?.toString() === store._id.toString()
        );

        if (storeItems.length === 0) continue;

        // Calculate totals for this store's items
        const itemsTotalPrice = storeItems.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );

        // Calculate commissions
        const siteCommission = itemsTotalPrice * SITE_COMMISSION_RATE;

        // Delivery commission (only for ShopIt courier)
        let deliveryCommission = 0;
        if (store.courierType !== 'seller') {
          deliveryCommission = Math.min(
            Math.max(itemsTotalPrice * DELIVERY_COMMISSION_RATE, DELIVERY_COMMISSION_MIN),
            DELIVERY_COMMISSION_MAX,
          );
        }

        const totalCommissions = siteCommission + deliveryCommission;
        const finalAmount = Math.max(0, itemsTotalPrice - totalCommissions);

        totalWaitingEarnings += finalAmount;
      }
    }

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
    const minWithdrawal = await this.siteSettingsService.getMinimumWithdrawalAmount();
    
    // Minimum withdrawal
    if (amount < minWithdrawal) {
      return { success: false, message: `Minimum withdrawal amount is ${minWithdrawal} GEL` };
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

