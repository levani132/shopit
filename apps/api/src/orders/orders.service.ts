import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection, Types, ClientSession } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderStatus,
  OrderItem,
  Product,
  ProductDocument,
  Store,
  StoreDocument,
  User,
  UserDocument,
} from '@sellit/api-database';
import { CreateOrderDto, ValidateCartDto } from './dto/order.dto';
import { StockReservationService } from './stock-reservation.service';
import { BalanceService } from './balance.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectConnection() private connection: Connection,
    private stockReservationService: StockReservationService,
    @Inject(forwardRef(() => BalanceService))
    private balanceService: BalanceService,
  ) {}

  /**
   * Validate cart items (check stock availability)
   */
  async validateCart(
    dto: ValidateCartDto,
  ): Promise<{ valid: boolean; unavailableItems: any[] }> {
    const unavailableItems: any[] = [];

    for (const item of dto.items) {
      const product = await this.productModel.findById(item.productId);

      if (!product) {
        unavailableItems.push({
          productId: item.productId,
          name: 'Unknown',
          reason: 'Product not found',
        });
        continue;
      }

      if (!product.isActive) {
        unavailableItems.push({
          productId: item.productId,
          name: product.name,
          reason: 'Product is no longer available',
        });
        continue;
      }

      // Check stock
      if (item.variantId && product.hasVariants && product.variants?.length) {
        const variant = product.variants.find(
          (v) => v._id.toString() === item.variantId,
        );

        if (!variant) {
          unavailableItems.push({
            productId: item.productId,
            name: product.name,
            reason: 'Variant not found',
          });
          continue;
        }

        if (variant.stock < item.quantity) {
          unavailableItems.push({
            productId: item.productId,
            name: product.name,
            reason: `Only ${variant.stock} available`,
            availableStock: variant.stock,
          });
        }
      } else {
        if (product.stock < item.quantity) {
          unavailableItems.push({
            productId: item.productId,
            name: product.name,
            reason: `Only ${product.stock} available`,
            availableStock: product.stock,
          });
        }
      }
    }

    return {
      valid: unavailableItems.length === 0,
      unavailableItems,
    };
  }

  /**
   * Create an order (with stock reservation)
   */
  async createOrder(
    dto: CreateOrderDto,
    userId?: string,
    externalOrderId?: string,
  ): Promise<OrderDocument> {
    if (!dto.orderItems || dto.orderItems.length < 1) {
      throw new BadRequestException('No order items received.');
    }

    // For guest orders, require guest info
    if ((!userId || dto.isGuestOrder) && !dto.guestInfo) {
      throw new BadRequestException('Guest checkout requires guest information.');
    }

    const session = await this.connection.startSession();

    try {
      const createdOrder = await session.withTransaction(async () => {
        // Validate and reserve stock for all items atomically
        const enhancedOrderItems: OrderItem[] = [];

        for (const item of dto.orderItems) {
          const product = await this.productModel
            .findById(item.productId)
            .session(session);

          if (!product) {
            throw new NotFoundException(
              `Product with ID ${item.productId} not found`,
            );
          }

          if (!product.isActive) {
            throw new BadRequestException(
              `Product "${product.name}" is no longer available`,
            );
          }

          // Get store info for delivery settings
          const store = await this.storeModel
            .findById(item.storeId)
            .session(session);

          if (!store) {
            throw new NotFoundException(
              `Store with ID ${item.storeId} not found`,
            );
          }

          // Check and reserve stock
          if (item.variantId && product.hasVariants && product.variants?.length) {
            const variantIndex = product.variants.findIndex(
              (v) => v._id.toString() === item.variantId,
            );

            if (variantIndex === -1) {
              throw new BadRequestException(
                `Variant not found for product ${product.name}`,
              );
            }

            if (product.variants[variantIndex].stock < item.qty) {
              throw new BadRequestException(
                `Not enough stock for product ${product.name}. Available: ${product.variants[variantIndex].stock}, Requested: ${item.qty}`,
              );
            }

            // Reserve stock
            product.variants[variantIndex].stock -= item.qty;
            product.totalStock -= item.qty;
          } else {
            if (product.stock < item.qty) {
              throw new BadRequestException(
                `Not enough stock for product ${product.name}. Available: ${product.stock}, Requested: ${item.qty}`,
              );
            }

            // Reserve stock
            product.stock -= item.qty;
            product.totalStock -= item.qty;
          }

          await product.save({ session });

          // Build enhanced order item with delivery info
          enhancedOrderItems.push({
            productId: new Types.ObjectId(item.productId),
            name: item.name,
            nameEn: item.nameEn,
            image: item.image,
            price: item.price,
            qty: item.qty,
            variantId: item.variantId
              ? new Types.ObjectId(item.variantId)
              : undefined,
            variantAttributes: item.variantAttributes || [],
            storeId: new Types.ObjectId(item.storeId),
            storeName: item.storeName,
            courierType: store.courierType,
            prepTimeMinDays: store.prepTimeMinDays,
            prepTimeMaxDays: store.prepTimeMaxDays,
            deliveryMinDays: store.deliveryMinDays,
            deliveryMaxDays: store.deliveryMaxDays,
          });
        }

        // Calculate prices
        const itemsPrice = enhancedOrderItems.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );

        // Calculate shipping price
        // - ShopIt courier: based on location (simplified to 0 for now)
        // - Seller courier: +10 GEL per store
        const storeIds = new Set(enhancedOrderItems.map((i) => i.storeId.toString()));
        let shippingPrice = 0;
        for (const storeId of storeIds) {
          const storeItem = enhancedOrderItems.find(
            (i) => i.storeId.toString() === storeId,
          );
          if (storeItem?.courierType === 'seller') {
            shippingPrice += 10; // 10 GEL for seller courier
          }
          // ShopIt courier shipping will be calculated separately
        }

        const taxPrice = 0; // No tax for now
        const totalPrice = itemsPrice + shippingPrice + taxPrice;

        // Create the order
        const orderData: any = {
          orderItems: enhancedOrderItems,
          shippingDetails: dto.shippingDetails,
          paymentMethod: dto.paymentMethod || 'BOG',
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice,
          externalOrderId,
          stockReservationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        };

        if (userId && !dto.isGuestOrder) {
          orderData.user = new Types.ObjectId(userId);
          orderData.isGuestOrder = false;
        } else {
          orderData.guestInfo = dto.guestInfo;
          orderData.isGuestOrder = true;
        }

        const [createdOrder] = await this.orderModel.create([orderData], {
          session,
        });

        return createdOrder;
      });

      return createdOrder;
    } finally {
      await session.endSession();
    }
  }

  /**
   * Find order by ID
   */
  async findById(orderId: string): Promise<OrderDocument> {
    if (!Types.ObjectId.isValid(orderId)) {
      throw new BadRequestException('Invalid order ID.');
    }

    const order = await this.orderModel.findById(orderId);
    if (!order) {
      throw new NotFoundException('Order not found.');
    }

    return order;
  }

  /**
   * Find order by external order ID (BOG)
   */
  async findByExternalOrderId(externalOrderId: string): Promise<OrderDocument> {
    const order = await this.orderModel.findOne({ externalOrderId });
    if (!order) {
      throw new NotFoundException(
        `Order with external ID ${externalOrderId} not found`,
      );
    }
    return order;
  }

  /**
   * Find orders for a user
   * Optionally filter by store subdomain
   */
  async findUserOrders(
    userId: string,
    storeSubdomain?: string,
  ): Promise<OrderDocument[]> {
    const query: any = { user: new Types.ObjectId(userId) };

    // If store subdomain is provided, find the store and filter by its ID
    if (storeSubdomain) {
      this.logger.log(`Filtering orders by store subdomain: ${storeSubdomain}`);
      const store = await this.storeModel.findOne({ subdomain: storeSubdomain });
      if (store) {
        this.logger.log(`Found store: ${store._id} for subdomain: ${storeSubdomain}`);
        query['orderItems.storeId'] = store._id;
      } else {
        this.logger.log(`Store not found for subdomain: ${storeSubdomain}`);
        // Store not found, return empty array
        return [];
      }
    } else {
      this.logger.log(`No store subdomain filter provided`);
    }

    this.logger.log(`Query: ${JSON.stringify(query)}`);
    const orders = await this.orderModel.find(query).sort({ createdAt: -1 });
    this.logger.log(`Found ${orders.length} orders`);
    
    // Log storeIds in found orders for debugging
    if (orders.length > 0) {
      const storeIds = orders.flatMap(o => o.orderItems.map(i => i.storeId?.toString()));
      this.logger.log(`Order storeIds: ${storeIds.join(', ')}`);
    }
    
    return orders;
  }

  /**
   * Find orders for a store (seller view)
   */
  async findStoreOrders(storeId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({ 'orderItems.storeId': new Types.ObjectId(storeId) })
      .sort({ createdAt: -1 });
  }

  /**
   * Update order with external order ID (for BOG payment)
   */
  async updateExternalOrderId(
    orderId: string,
    externalOrderId: string,
  ): Promise<void> {
    const order = await this.findById(orderId);
    order.externalOrderId = externalOrderId;
    await order.save();
  }

  /**
   * Mark order as paid
   */
  async markAsPaid(
    orderId: string,
    paymentResult: {
      id: string;
      status: string;
      updateTime: string;
      emailAddress?: string;
    },
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    if (order.isPaid) {
      throw new BadRequestException('Order is already paid.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot pay for cancelled order. Please create a new order.',
      );
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = paymentResult;
    order.status = OrderStatus.PAID;
    order.stockReservationExpires = undefined; // Remove expiration

    return order.save();
  }

  /**
   * Mark order as paid by external order ID (callback)
   */
  async markAsPaidByExternalId(
    externalOrderId: string,
    paymentResult: {
      id: string;
      status: string;
      updateTime: string;
      emailAddress?: string;
    },
  ): Promise<OrderDocument> {
    const order = await this.findByExternalOrderId(externalOrderId);

    if (order.isPaid) {
      throw new BadRequestException('Order is already paid.');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot pay for cancelled order. Please create a new order.',
      );
    }

    order.isPaid = true;
    order.paidAt = new Date();
    order.paymentResult = paymentResult;
    order.status = OrderStatus.PAID;
    order.stockReservationExpires = undefined;

    return order.save();
  }

  /**
   * Update order status (seller action)
   */
  async updateStatus(
    orderId: string,
    storeId: string,
    newStatus: OrderStatus,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    // Verify this store has items in the order
    const hasStoreItems = order.orderItems.some(
      (item) => item.storeId.toString() === storeId,
    );

    if (!hasStoreItems) {
      throw new BadRequestException(
        'You do not have permission to update this order.',
      );
    }

    order.status = newStatus;

    if (newStatus === OrderStatus.DELIVERED) {
      order.isDelivered = true;
      order.deliveredAt = new Date();

      // Process seller earnings when order is delivered
      await order.save();
      await this.balanceService.processOrderEarnings(order);
      return order;
    }

    return order.save();
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, reason?: string): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled.');
    }

    if (order.isPaid) {
      throw new BadRequestException(
        'Cannot cancel paid order automatically. Please contact support.',
      );
    }

    // Refund stock
    await this.stockReservationService.releaseStockForOrder(orderId);

    // The releaseStockForOrder already updates the status
    return this.findById(orderId);
  }

  /**
   * Link guest orders to a newly registered user
   */
  async linkGuestOrdersByEmail(
    email: string,
    userId: string,
  ): Promise<{ linkedCount: number }> {
    try {
      const result = await this.orderModel.updateMany(
        {
          isGuestOrder: true,
          'guestInfo.email': email.toLowerCase(),
        },
        {
          $set: {
            user: new Types.ObjectId(userId),
            isGuestOrder: false,
          },
          $unset: {
            guestInfo: '',
          },
        },
      );

      this.logger.log(
        `Linked ${result.modifiedCount} guest orders to user ${userId}`,
      );

      return { linkedCount: result.modifiedCount };
    } catch (error) {
      this.logger.error(`Failed to link guest orders: ${error}`);
      return { linkedCount: 0 };
    }
  }
}

