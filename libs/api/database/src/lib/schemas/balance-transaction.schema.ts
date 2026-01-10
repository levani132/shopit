import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BalanceTransactionDocument = HydratedDocument<BalanceTransaction>;

// Transaction types
export enum TransactionType {
  EARNING = 'earning', // Money earned from a sale
  WITHDRAWAL_PENDING = 'withdrawal_pending', // Withdrawal requested
  WITHDRAWAL_COMPLETED = 'withdrawal_completed', // Withdrawal successful
  WITHDRAWAL_REJECTED = 'withdrawal_rejected', // Withdrawal rejected
  WITHDRAWAL_FAILED = 'withdrawal_failed', // Withdrawal failed
  REFUND = 'refund', // Order refunded, money deducted
}

@Schema({ timestamps: true, collection: 'balance_transactions' })
export class BalanceTransaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  sellerId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId; // Optional, only for earnings/refunds

  @Prop({ type: Types.ObjectId, ref: 'Store', required: true, index: true })
  storeId!: Types.ObjectId;

  @Prop({ required: true })
  amount!: number; // Positive for earnings, negative for withdrawals/deductions

  @Prop({ type: String, enum: TransactionType, required: true, index: true })
  type!: TransactionType;

  @Prop({ required: true })
  description!: string;

  // Commission details (for earnings)
  @Prop({ min: 0 })
  commissionPercentage?: number; // e.g., 10 for 10%

  @Prop({ min: 0 })
  commissionAmount?: number; // Actual commission deducted

  @Prop({ min: 0 })
  deliveryCommissionAmount?: number; // Delivery fee deducted (for ShopIt courier)

  @Prop({ min: 0 })
  productPrice?: number; // Original product price before deductions

  @Prop()
  finalAmount?: number; // Amount after all deductions (added to balance)

  // Withdrawal details (for withdrawals)
  @Prop()
  bankAccountNumber?: string;

  @Prop()
  bogUniqueKey?: number; // BOG transfer document ID
}

export const BalanceTransactionSchema =
  SchemaFactory.createForClass(BalanceTransaction);

// Indexes
BalanceTransactionSchema.index({ sellerId: 1, createdAt: -1 });
BalanceTransactionSchema.index({ storeId: 1, type: 1 });
BalanceTransactionSchema.index({ type: 1, createdAt: -1 }); // For admin queries

