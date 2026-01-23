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
} from '@shopit/api-database';
import { CreateOrderDto, ValidateCartDto } from './dto/order.dto';
import { StockReservationService } from './stock-reservation.service';
import { BalanceService } from './balance.service';
import { SiteSettingsService } from '../admin/site-settings.service';
import { DeliveryFeeService, ShippingSize } from './delivery-fee.service';
import { RoutesService } from '../routes/routes.service';
import {
  VehicleType,
  VEHICLE_CAPACITIES,
  SHIPPING_SIZES,
} from '@shopit/constants';

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
    private siteSettingsService: SiteSettingsService,
    private deliveryFeeService: DeliveryFeeService,
    @Inject(forwardRef(() => RoutesService))
    private routesService: RoutesService,
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
      throw new BadRequestException(
        'Guest checkout requires guest information.',
      );
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
          if (
            item.variantId &&
            product.hasVariants &&
            product.variants?.length
          ) {
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

          // Get the ACTUAL price from database (never trust frontend prices!)
          let actualPrice: number;
          let actualImage: string;

          if (
            item.variantId &&
            product.hasVariants &&
            product.variants?.length
          ) {
            const variant = product.variants.find(
              (v) => v._id.toString() === item.variantId,
            );
            if (variant) {
              // Use variant price if set, otherwise use product price
              actualPrice =
                product.isOnSale && (variant.salePrice || product.salePrice)
                  ? variant.salePrice || product.salePrice || product.price
                  : variant.price || product.price;
              // Use variant image if available
              actualImage =
                variant.images?.[0] || product.images?.[0] || item.image;
            } else {
              actualPrice =
                product.isOnSale && product.salePrice
                  ? product.salePrice
                  : product.price;
              actualImage = product.images?.[0] || item.image;
            }
          } else {
            // Non-variant product
            actualPrice =
              product.isOnSale && product.salePrice
                ? product.salePrice
                : product.price;
            actualImage = product.images?.[0] || item.image;
          }

          // Build enhanced order item with delivery info
          enhancedOrderItems.push({
            productId: new Types.ObjectId(item.productId),
            name: product.name, // Use DB name
            nameEn: product.nameLocalized?.en || product.name,
            image: actualImage,
            price: actualPrice, // USE DB PRICE, NOT FRONTEND PRICE!
            qty: item.qty,
            variantId: item.variantId
              ? new Types.ObjectId(item.variantId)
              : undefined,
            variantAttributes: item.variantAttributes || [],
            storeId: new Types.ObjectId(item.storeId),
            storeName: store.name, // Use DB store name
            storeSubdomain: store.subdomain, // For product links
            courierType: store.courierType,
            // If noPrepRequired is true, prep time is 0 (items ship same day)
            prepTimeMinDays: store.noPrepRequired
              ? 0
              : store.prepTimeMinDays || 0,
            prepTimeMaxDays: store.noPrepRequired
              ? 0
              : store.prepTimeMaxDays || 0,
            deliveryMinDays: store.deliveryMinDays,
            deliveryMaxDays: store.deliveryMaxDays,
            shippingSize: product.shippingSize || 'small',
          });
        }

        // Calculate prices
        const itemsPrice = enhancedOrderItems.reduce(
          (sum, item) => sum + item.price * item.qty,
          0,
        );

        // Determine delivery method
        const deliveryMethod = dto.deliveryMethod || 'delivery';

        // Calculate shipping price
        // - Self-pickup: always free
        // - Self-delivery (seller handles): free (no extra fee, only site commission applies)
        // - ShopIt courier: based on location/distance
        let shippingPrice = 0;
        if (deliveryMethod === 'pickup') {
          // Self-pickup is always free
          shippingPrice = 0;
        } else {
          // Group items by store for shipping calculation
          const storeIds = new Set(
            enhancedOrderItems.map((i) => i.storeId.toString()),
          );

          for (const storeId of storeIds) {
            const store = await this.storeModel
              .findById(storeId)
              .session(session);
            if (!store) continue;

            if (store.courierType === 'shopit') {
              // ShopIt delivery - calculate based on distance and product size

              // Validate locations
              if (!store.location?.lat || !store.location?.lng) {
                this.logger.warn(
                  `Store ${store.name} has no location set for ShopIt delivery`,
                );
                throw new BadRequestException(
                  `Store "${store.name}" has not configured its location for delivery`,
                );
              }

              if (
                !dto.shippingDetails?.location?.lat ||
                !dto.shippingDetails?.location?.lng
              ) {
                throw new BadRequestException(
                  'Delivery address location is required for ShopIt delivery. Please select a location on the map.',
                );
              }

              // Get the largest shipping size from this store's items
              const storeItems = enhancedOrderItems.filter(
                (i) => i.storeId.toString() === storeId,
              );
              const sizes: ShippingSize[] = [
                'small',
                'medium',
                'large',
                'extra_large',
              ];
              let maxSizeIndex = 0;
              for (const item of storeItems) {
                const size = (item as any).shippingSize || 'small';
                const index = sizes.indexOf(size);
                if (index > maxSizeIndex) maxSizeIndex = index;
              }
              const largestSize = sizes[maxSizeIndex];

              // Calculate delivery fee
              const deliveryResult =
                await this.deliveryFeeService.calculateDeliveryFee(
                  { lat: store.location.lat, lng: store.location.lng },
                  {
                    lat: dto.shippingDetails.location.lat,
                    lng: dto.shippingDetails.location.lng,
                  },
                  largestSize,
                );

              shippingPrice += deliveryResult.fee;
              this.logger.log(
                `ShopIt delivery fee for store ${store.name}: ${deliveryResult.fee} GEL (${deliveryResult.durationMinutes} min, ${largestSize})`,
              );
            }
            // Self-delivery is free - only site commission applies
          }
        }

        const taxPrice = 0; // No tax for now
        const totalPrice = itemsPrice + shippingPrice + taxPrice;

        // Get pickup address from the first store (for courier)
        const firstStoreId = enhancedOrderItems[0]?.storeId;
        const pickupStore = firstStoreId
          ? await this.storeModel.findById(firstStoreId).session(session)
          : null;

        // Get recipient name for courier display
        let recipientName: string | undefined;
        if (userId && !dto.isGuestOrder) {
          const user = await this.userModel.findById(userId).session(session);
          if (user) {
            recipientName = `${user.firstName} ${user.lastName}`.trim();
          }
        } else if (dto.guestInfo?.fullName) {
          recipientName = dto.guestInfo.fullName;
        }

        // Create the order
        const orderData: any = {
          orderItems: enhancedOrderItems,
          shippingDetails: dto.shippingDetails,
          paymentMethod: dto.paymentMethod || 'BOG',
          deliveryMethod,
          itemsPrice,
          shippingPrice,
          taxPrice,
          totalPrice,
          externalOrderId,
          stockReservationExpires: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          // Pickup address for courier
          pickupStoreName: pickupStore?.name,
          pickupAddress: pickupStore?.address,
          pickupCity: pickupStore?.city,
          pickupPhoneNumber: pickupStore?.phone,
          // Pickup location coordinates (from store)
          pickupLocation: pickupStore?.location,
          // Delivery location coordinates (from shipping address)
          deliveryLocation: dto.shippingDetails?.location,
          // Recipient name for courier display
          recipientName,
        };

        // Calculate the largest shipping size for the entire order
        // This is used as initial estimation for vehicle type needed
        const allSizes: ShippingSize[] = [
          'small',
          'medium',
          'large',
          'extra_large',
        ];
        let orderMaxSizeIndex = 0;
        for (const item of enhancedOrderItems) {
          const size = (item as any).shippingSize || 'small';
          const index = allSizes.indexOf(size);
          if (index > orderMaxSizeIndex) orderMaxSizeIndex = index;
        }
        const estimatedSize = allSizes[orderMaxSizeIndex];
        orderData.estimatedShippingSize = estimatedSize;
        orderData.shippingSize = estimatedSize; // Effective size (will be updated when seller confirms)

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
      const store = await this.storeModel.findOne({
        subdomain: storeSubdomain,
      });
      if (store) {
        this.logger.log(
          `Found store: ${store._id} for subdomain: ${storeSubdomain}`,
        );
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
    const orders = await this.orderModel
      .find(query)
      .populate('courierId', 'firstName lastName phoneNumber')
      .sort({ createdAt: -1 });
    this.logger.log(`Found ${orders.length} orders`);

    // Log storeIds in found orders for debugging
    if (orders.length > 0) {
      const storeIds = orders.flatMap((o) =>
        o.orderItems.map((i) => i.storeId?.toString()),
      );
      this.logger.log(`Order storeIds: ${storeIds.join(', ')}`);
    }

    // Populate storeSubdomain for order items that don't have it (backwards compatibility)
    await this.populateStoreSubdomains(orders);

    return orders;
  }

  /**
   * Populate storeSubdomain for order items that don't have it (backwards compatibility)
   */
  private async populateStoreSubdomains(
    orders: OrderDocument[],
  ): Promise<void> {
    // Collect unique storeIds that need subdomain lookup
    const storeIdsToLookup = new Set<string>();
    for (const order of orders) {
      for (const item of order.orderItems) {
        if (!item.storeSubdomain && item.storeId) {
          storeIdsToLookup.add(item.storeId.toString());
        }
      }
    }

    // Fetch stores if needed
    if (storeIdsToLookup.size > 0) {
      const stores = await this.storeModel.find({
        _id: {
          $in: Array.from(storeIdsToLookup).map((id) => new Types.ObjectId(id)),
        },
      });
      const storeMap = new Map(
        stores.map((s) => [s._id.toString(), s.subdomain]),
      );

      // Populate storeSubdomain on order items
      for (const order of orders) {
        for (const item of order.orderItems) {
          if (!item.storeSubdomain && item.storeId) {
            item.storeSubdomain = storeMap.get(item.storeId.toString());
          }
        }
      }
    }
  }

  /**
   * Find orders for a store (seller view)
   */
  async findStoreOrders(storeId: string): Promise<OrderDocument[]> {
    const orders = await this.orderModel
      .find({ 'orderItems.storeId': new Types.ObjectId(storeId) })
      .populate('courierId', 'firstName lastName phoneNumber')
      .sort({ createdAt: -1 });

    // Populate storeSubdomain for order items that don't have it (backwards compatibility)
    await this.populateStoreSubdomains(orders);

    return orders;
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

    // Calculate delivery deadline based on store's prep and delivery times
    order.deliveryDeadline = this.calculateDeliveryDeadline(order);

    return order.save();
  }

  /**
   * Calculate delivery deadline based on order items' prep and delivery times
   *
   * For ShopIt courier (courierType !== 'seller'):
   * - Tbilisi: 1-3 days (use max 3)
   * - Outside Tbilisi: 3-5 days (use max 5)
   *
   * For seller-handled delivery:
   * - Uses store's deliveryMaxDays setting
   */
  private calculateDeliveryDeadline(order: OrderDocument): Date {
    const now = new Date();
    let maxDays = 3; // Default: 3 days

    // Check if delivery is within Tbilisi (case-insensitive check)
    const deliveryCity = order.shippingDetails?.city?.toLowerCase() || '';
    const isTbilisi =
      deliveryCity.includes('tbilisi') || deliveryCity.includes('თბილისი');

    // Get the maximum prep + delivery days from all order items
    for (const item of order.orderItems) {
      const prepDays = item.prepTimeMaxDays || 0;

      let deliveryDays: number;
      if (item.courierType === 'seller') {
        // Seller handles delivery - use store's setting
        deliveryDays = item.deliveryMaxDays || 3;
      } else {
        // ShopIt courier - use location-based estimate
        deliveryDays = isTbilisi ? 3 : 5; // 1-3 days Tbilisi, 3-5 days outside
      }

      const totalDays = prepDays + deliveryDays;
      if (totalDays > maxDays) {
        maxDays = totalDays;
      }
    }

    // Add maxDays to current date
    const deadline = new Date(now);
    deadline.setDate(deadline.getDate() + maxDays);
    return deadline;
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

    // Calculate delivery deadline based on store's prep and delivery times
    order.deliveryDeadline = this.calculateDeliveryDeadline(order);

    return order.save();
  }

  /**
   * Update order status (seller action)
   *
   * Status transition rules:
   * - CANCELLED/REFUNDED: No changes allowed
   * - PENDING: No manual status changes allowed (must wait for payment)
   * - PAID: Can move to PROCESSING, SHIPPED, DELIVERED
   * - PROCESSING: Can move to SHIPPED, DELIVERED, or back to PAID
   * - SHIPPED: Can move to DELIVERED, or back to PROCESSING
   * - DELIVERED: Can move back to SHIPPED (in case of error)
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

    const currentStatus = order.status;

    // Rule 1: Cancelled orders cannot have their status changed
    if (currentStatus === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Cannot change status of a cancelled order.',
      );
    }

    // Rule 1b: Refunded orders cannot have their status changed
    if (currentStatus === OrderStatus.REFUNDED) {
      throw new BadRequestException(
        'Cannot change status of a refunded order.',
      );
    }

    // Rule 3: Pending orders cannot be manually updated
    if (currentStatus === OrderStatus.PENDING) {
      throw new BadRequestException(
        'Cannot manually change status of a pending order. Wait for payment to be processed.',
      );
    }

    // Rule 2: After paid, cannot go back to pending
    if (newStatus === OrderStatus.PENDING) {
      throw new BadRequestException('Cannot set order status back to pending.');
    }

    // Cannot manually set to CANCELLED or REFUNDED through this endpoint
    if (
      newStatus === OrderStatus.CANCELLED ||
      newStatus === OrderStatus.REFUNDED
    ) {
      throw new BadRequestException(
        'Use the dedicated cancel or refund endpoints for these actions.',
      );
    }

    // Cannot manually set to PAID (only payment system can do this)
    if (newStatus === OrderStatus.PAID && currentStatus !== OrderStatus.PAID) {
      throw new BadRequestException(
        'Cannot manually set order as paid. Payment must be processed through the payment system.',
      );
    }

    // Rule: Once a courier is assigned, seller cannot change status anymore
    if (order.courierId) {
      throw new BadRequestException(
        'A courier has been assigned to this order. You can no longer change the status. The courier will handle delivery.',
      );
    }

    // Get the store to check courier type
    const store = await this.storeModel.findById(storeId);
    if (!store) {
      throw new BadRequestException('Store not found.');
    }

    const usesShopItDelivery = store.courierType === 'shopit';

    // Rule 4: Define allowed statuses based on courier type
    let allowedStatuses: OrderStatus[];

    if (usesShopItDelivery) {
      // ShopIt delivery: Sellers can only go up to READY_FOR_DELIVERY
      // SHIPPED and DELIVERED can only be set by couriers
      allowedStatuses = [
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.READY_FOR_DELIVERY,
      ];
    } else {
      // Self delivery: Sellers can manage the entire flow
      allowedStatuses = [
        OrderStatus.PAID,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];
    }

    if (!allowedStatuses.includes(newStatus)) {
      if (
        usesShopItDelivery &&
        (newStatus === OrderStatus.SHIPPED ||
          newStatus === OrderStatus.DELIVERED)
      ) {
        throw new BadRequestException(
          'With ShopIt delivery, only couriers can mark orders as shipped or delivered. Set status to "Ready for Delivery" when the order is prepared.',
        );
      }
      throw new BadRequestException(
        `Invalid status transition. Allowed statuses: ${allowedStatuses.join(', ')}`,
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
   * Update order shipping size (seller action)
   * Allows seller to confirm or change the estimated shipping size
   * Only allowed before order is assigned to a courier
   */
  async updateShippingSize(
    orderId: string,
    storeId: string,
    newSize: 'small' | 'medium' | 'large' | 'extra_large',
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

    // Cannot update shipping size after courier is assigned
    if (order.courierId) {
      throw new BadRequestException(
        'Cannot change shipping size after a courier has been assigned.',
      );
    }

    // Cannot update if order is already delivered/cancelled/refunded
    if (
      order.status === OrderStatus.CANCELLED ||
      order.status === OrderStatus.REFUNDED ||
      order.status === OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Cannot change shipping size for completed or cancelled orders.',
      );
    }

    // Update both confirmedShippingSize and shippingSize (effective)
    order.confirmedShippingSize = newSize;
    order.shippingSize = newSize;

    this.logger.log(
      `Order ${orderId} shipping size updated from ${order.estimatedShippingSize} to ${newSize} by seller`,
    );

    return order.save();
  }

  /**
   * Update order status (courier action)
   * Only for orders using ShopIt delivery
   */
  async updateStatusByCourier(
    orderId: string,
    courierId: string,
    newStatus: OrderStatus,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    // Get the store to verify it uses ShopIt delivery
    const storeId = order.orderItems[0]?.storeId;
    if (!storeId) {
      throw new BadRequestException('Order has no store items.');
    }

    const store = await this.storeModel.findById(storeId);
    if (!store) {
      throw new BadRequestException('Store not found.');
    }

    if (store.courierType !== 'shopit') {
      throw new BadRequestException(
        'This order uses seller delivery. Only the seller can update its status.',
      );
    }

    const currentStatus = order.status;

    // Couriers can only update orders that are READY_FOR_DELIVERY or already SHIPPED
    if (
      currentStatus !== OrderStatus.READY_FOR_DELIVERY &&
      currentStatus !== OrderStatus.SHIPPED
    ) {
      throw new BadRequestException(
        'Couriers can only update orders that are ready for delivery or already shipped.',
      );
    }

    // Couriers can only set SHIPPED or DELIVERED
    if (
      newStatus !== OrderStatus.SHIPPED &&
      newStatus !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'Couriers can only set status to shipped or delivered.',
      );
    }

    // Assign courier to order if not already assigned
    if (!order.courierId) {
      order.courierId = new Types.ObjectId(courierId);
    }

    order.status = newStatus;

    if (newStatus === OrderStatus.SHIPPED) {
      order.shippedAt = new Date();
    }

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
   * Get orders ready for delivery (for couriers)
   * Returns ALL orders with status READY_FOR_DELIVERY from ShopIt delivery stores
   *
   * Sorting priority:
   * 1. By delivery deadline (earliest first - most urgent)
   * 2. Orders that this vehicle can carry (matching size)
   * 3. Orders smaller than this vehicle capacity
   * 4. Everything else from smallest to biggest
   */
  async getOrdersReadyForDelivery(
    courierId?: string,
    vehicleType?: string,
  ): Promise<OrderDocument[]> {
    // Build query for ALL available orders (not filtered by vehicle)
    const query: Record<string, unknown> = {
      status: OrderStatus.READY_FOR_DELIVERY,
      courierId: { $exists: false },
    };

    // Find all orders that are ready for delivery and not yet assigned
    const orders = await this.orderModel
      .find(query)
      .sort({ deliveryDeadline: 1, createdAt: 1 }) // Most urgent first
      .limit(100)
      .exec();

    // If no vehicle type provided, return all orders sorted by deadline
    if (!vehicleType || !this.isValidVehicleType(vehicleType)) {
      return orders;
    }

    // Get compatible sizes for this vehicle
    const compatibleSizes = this.getCompatibleShippingSizes(
      vehicleType as VehicleType,
    );

    // Size priority (smallest to largest)
    const sizeOrder: Record<string, number> = {
      small: 1,
      medium: 2,
      large: 3,
      extra_large: 4,
    };

    // Sort orders with custom logic:
    // 1. First, orders are already sorted by deadline
    // 2. Within similar deadlines, prioritize by vehicle compatibility
    const sortedOrders = orders.sort((a, b) => {
      // First compare by deadline (already done by DB, but keep for stability)
      const deadlineA = a.deliveryDeadline?.getTime() || Infinity;
      const deadlineB = b.deliveryDeadline?.getTime() || Infinity;

      if (deadlineA !== deadlineB) {
        return deadlineA - deadlineB;
      }

      // Get effective shipping size for each order
      const sizeA =
        a.confirmedShippingSize ||
        a.estimatedShippingSize ||
        a.shippingSize ||
        'small';
      const sizeB =
        b.confirmedShippingSize ||
        b.estimatedShippingSize ||
        b.shippingSize ||
        'small';

      const canCarryA = compatibleSizes.includes(sizeA as ShippingSize);
      const canCarryB = compatibleSizes.includes(sizeB as ShippingSize);

      // Orders this vehicle can carry come first
      if (canCarryA && !canCarryB) return -1;
      if (!canCarryA && canCarryB) return 1;

      // Within same category, sort by size (smaller first for can carry, then rest smallest to biggest)
      return sizeOrder[sizeA] - sizeOrder[sizeB];
    });

    return sortedOrders;
  }

  /**
   * Check if a vehicle type is valid
   */
  private isValidVehicleType(type: string): boolean {
    return ['walking', 'bicycle', 'motorcycle', 'car', 'suv', 'van'].includes(
      type,
    );
  }

  /**
   * Get compatible shipping sizes for a vehicle type
   * Based on VEHICLE_CAPACITIES - returns sizes where capacity > 0
   */
  private getCompatibleShippingSizes(vehicleType: VehicleType): ShippingSize[] {
    const capacity = VEHICLE_CAPACITIES[vehicleType];
    const compatible: ShippingSize[] = [];

    for (const size of SHIPPING_SIZES) {
      // Size is compatible if capacity is -1 (unlimited) or > 0
      if (capacity[size] === -1 || capacity[size] > 0) {
        compatible.push(size as ShippingSize);
      }
    }

    return compatible;
  }

  /**
   * Get orders assigned to a specific courier
   * Sorted by delivery deadline (most urgent first)
   */
  async getOrdersByCourier(courierId: string): Promise<OrderDocument[]> {
    return this.orderModel
      .find({
        courierId: new Types.ObjectId(courierId),
        status: { $in: [OrderStatus.READY_FOR_DELIVERY, OrderStatus.SHIPPED] },
      })
      .sort({ deliveryDeadline: 1, createdAt: 1 }) // Sort by deadline (ascending = most urgent first)
      .exec();
  }

  /**
   * Get completed orders delivered by a specific courier
   * Sorted by delivery date (most recent first)
   */
  async getCompletedOrdersByCourier(
    courierId: string,
    limit = 20,
  ): Promise<OrderDocument[]> {
    return this.orderModel
      .find({
        courierId: new Types.ObjectId(courierId),
        status: OrderStatus.DELIVERED,
      })
      .sort({ deliveredAt: -1, createdAt: -1 }) // Most recent first
      .limit(limit)
      .exec();
  }

  /**
   * Assign an order to a courier
   */
  async assignCourier(
    orderId: string,
    courierId: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    if (order.status !== OrderStatus.READY_FOR_DELIVERY) {
      throw new BadRequestException(
        'Can only assign orders that are ready for delivery.',
      );
    }

    if (order.courierId) {
      throw new BadRequestException('Order is already assigned to a courier.');
    }

    // Verify the store uses ShopIt delivery
    const storeId = order.orderItems[0]?.storeId;
    if (storeId) {
      const store = await this.storeModel.findById(storeId);
      if (store && store.courierType !== 'shopit') {
        throw new BadRequestException(
          'This order uses seller delivery and cannot be assigned to a courier.',
        );
      }
    }

    order.courierId = new Types.ObjectId(courierId);
    order.courierAssignedAt = new Date();
    return order.save();
  }

  /**
   * Unassign an order from a courier (courier abandons the order)
   * Only the assigned courier can abandon their order
   * Also removes the order from any active route
   */
  async unassignCourier(
    orderId: string,
    courierId: string,
  ): Promise<OrderDocument> {
    const order = await this.findById(orderId);

    // Only allow unassigning if the order is assigned to this courier
    if (!order.courierId || order.courierId.toString() !== courierId) {
      throw new BadRequestException('You are not assigned to this order.');
    }

    // Can only abandon orders that haven't been delivered yet
    if (order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot abandon a delivered order.');
    }

    // Remove order from any active route
    try {
      await this.routesService.removeOrderFromRoute(courierId, orderId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(
        `Failed to remove order ${orderId} from route: ${errorMessage}`,
      );
      // Continue with unassignment even if route update fails
    }

    // Reset courier assignment
    order.courierId = undefined;
    order.courierAssignedAt = undefined;

    // If the order was shipped (in transit), reset to ready_for_delivery
    if (order.status === OrderStatus.SHIPPED) {
      order.status = OrderStatus.READY_FOR_DELIVERY;
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
