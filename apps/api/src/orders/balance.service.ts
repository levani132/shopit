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

// Commission rates
const SITE_COMMISSION_RATE = 0.10; // 10% website fee
const SELLER_COURIER_FEE = 10; // 10 GEL for seller-handled delivery

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
        // ShopIt courier - calculate based on distance/dimensions (simplified for now)
        // Using a percentage-based approach: 5% with min 10 GEL, max 50 GEL
        deliveryCommission = Math.min(
          Math.max(itemsTotalPrice * 0.05, 10),
          50,
        );
      }

      const totalCommissions = siteCommission + deliveryCommission;
      // Ensure seller never gets negative earnings
      // If commissions exceed item price, seller gets 0 (commissions are capped at item price)
      const finalAmount = Math.max(0, itemsTotalPrice - totalCommissions);
      const actualCommissions = itemsTotalPrice - finalAmount;

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
   * Get seller's balance summary
   */
  async getSellerBalance(sellerId: string): Promise<{
    balance: number;
    totalEarnings: number;
    pendingWithdrawals: number;
    totalWithdrawn: number;
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
      };
    }

    return {
      balance: user.balance || 0,
      totalEarnings: user.totalEarnings || 0,
      pendingWithdrawals: user.pendingWithdrawals || 0,
      totalWithdrawn: user.totalWithdrawn || 0,
    };
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

    // Minimum withdrawal
    if (amount < 1) {
      return { success: false, message: 'Minimum withdrawal amount is 1 GEL' };
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

