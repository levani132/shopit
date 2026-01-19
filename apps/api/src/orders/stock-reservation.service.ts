import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, ClientSession, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import {
  Order,
  OrderDocument,
  OrderStatus,
  Product,
  ProductDocument,
} from '@shopit/api-database';

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectConnection() private connection: Connection,
  ) {}

  /**
   * Runs every minute to check for expired stock reservations
   * Automatically releases expired stock and marks orders as cancelled
   */
  @Cron('0 * * * * *') // Every minute
  async releaseExpiredStockReservations(): Promise<void> {
    const now = new Date();

    // Find unpaid orders with expired stock reservations
    const expiredOrders = await this.orderModel.find({
      isPaid: false,
      stockReservationExpires: { $lte: now },
      status: { $in: [OrderStatus.PENDING] },
    });

    if (expiredOrders.length === 0) {
      return;
    }

    this.logger.log(
      `Processing ${expiredOrders.length} expired stock reservations`,
    );

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        for (const order of expiredOrders) {
          try {
            // Double-check order hasn't been paid or cancelled
            const freshOrder = await this.orderModel
              .findById(order._id)
              .session(session);

            if (
              !freshOrder ||
              freshOrder.isPaid ||
              freshOrder.status === OrderStatus.CANCELLED
            ) {
              this.logger.log(
                `Skipping order ${order._id} - already processed or paid`,
              );
              continue;
            }

            await this.refundStockForOrder(freshOrder, session);

            // Mark order as cancelled
            freshOrder.status = OrderStatus.CANCELLED;
            freshOrder.statusReason =
              'Stock reservation expired after 10 minutes';
            freshOrder.cancelledAt = new Date();
            await freshOrder.save({ session });

            this.logger.log(
              `Released stock and cancelled expired order: ${order._id}`,
            );
          } catch (error) {
            this.logger.error(
              `Error releasing stock for order ${order._id}:`,
              error,
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }

    this.logger.log(
      `Released stock for ${expiredOrders.length} expired orders`,
    );
  }

  /**
   * Refund stock for a specific order
   */
  async refundStockForOrder(
    order: OrderDocument,
    session?: ClientSession,
  ): Promise<void> {
    // Ensure order is in a state where stock refund is appropriate
    if (order.isPaid || order.status === OrderStatus.CANCELLED) {
      this.logger.warn(
        `Attempted to refund stock for order ${order._id} but it's already paid or cancelled`,
      );
      return;
    }

    for (const item of order.orderItems) {
      let productQuery = this.productModel.findById(item.productId);
      if (session) {
        productQuery = productQuery.session(session);
      }

      const product = await productQuery;

      if (!product) {
        this.logger.warn(
          `Product with ID ${item.productId} not found during stock refund for order ${order._id}`,
        );
        continue;
      }

      // Refund stock
      if (item.variantId && product.hasVariants && product.variants?.length) {
        // Find the variant and refund its stock
        const variantIndex = product.variants.findIndex(
          (v) => v._id.toString() === item.variantId?.toString(),
        );

        if (variantIndex >= 0) {
          product.variants[variantIndex].stock += item.qty;
          product.totalStock += item.qty;
        } else {
          // Fallback to general stock if variant not found
          product.stock += item.qty;
          product.totalStock += item.qty;
        }
      } else {
        // Non-variant product
        product.stock += item.qty;
        product.totalStock += item.qty;
      }

      if (session) {
        await product.save({ session });
      } else {
        await product.save();
      }
    }
  }

  /**
   * Manually release stock for a specific order (can be called from API)
   */
  async releaseStockForOrder(orderId: string): Promise<void> {
    const order = await this.orderModel.findById(orderId);

    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (order.isPaid) {
      throw new Error(`Cannot release stock for paid order ${orderId}`);
    }

    const session = await this.connection.startSession();

    try {
      await session.withTransaction(async () => {
        await this.refundStockForOrder(order, session);

        // Mark order as cancelled
        order.status = OrderStatus.CANCELLED;
        order.statusReason = 'Manually cancelled';
        order.cancelledAt = new Date();
        await order.save({ session });
      });

      this.logger.log(`Manually released stock for order: ${orderId}`);
    } finally {
      await session.endSession();
    }
  }
}

