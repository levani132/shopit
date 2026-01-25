import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import {
  User,
  UserDocument,
  Store,
  StoreDocument,
  Product,
  ProductDocument,
  Category,
  CategoryDocument,
  Subcategory,
  SubcategoryDocument,
  Attribute,
  AttributeDocument,
  Order,
  OrderDocument,
  BalanceTransaction,
  BalanceTransactionDocument,
  WishlistItem,
  WishlistItemDocument,
  Notification,
  NotificationDocument,
  CourierRoute,
  CourierRouteDocument,
} from '@shopit/api-database';
import { Role } from '@shopit/constants';
import {
  CleanupLevel,
  SeedUsersDto,
  SeedProductsDto,
  SeedOrdersDto,
} from './dto/dev-tools.dto';

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  roleNumber: number;
  store?: {
    id: string;
    subdomain: string;
    name: string;
  };
}

// Georgian first names
const FIRST_NAMES_KA = [
  'გიორგი',
  'დავით',
  'ნიკა',
  'ლევან',
  'გიგა',
  'ზურა',
  'ირაკლი',
  'მარიამ',
  'თამარ',
  'ნინო',
  'ანა',
  'ნათია',
  'ელენე',
  'სალომე',
];

// Georgian last names
const LAST_NAMES_KA = [
  'ბერიძე',
  'გელაშვილი',
  'კვარაცხელია',
  'მამულაშვილი',
  'ლობჟანიძე',
  'კვირიკაშვილი',
  'ხოჯავანიშვილი',
  'ჯავახიშვილი',
];

// Product categories with Georgian names
const PRODUCT_CATEGORIES = [
  {
    name: 'ტანსაცმელი',
    nameEn: 'Clothing',
    subcategories: [
      'მაისურები',
      'პერანგები',
      'შარვლები',
      'კაბები',
      'ქურთუკები',
    ],
    attributes: ['ზომა', 'ფერი', 'მასალა'],
  },
  {
    name: 'ფეხსაცმელი',
    nameEn: 'Footwear',
    subcategories: ['სპორტული', 'კლასიკური', 'ზაფხულის', 'ზამთრის'],
    attributes: ['ზომა', 'ფერი', 'ბრენდი'],
  },
  {
    name: 'აქსესუარები',
    nameEn: 'Accessories',
    subcategories: ['ჩანთები', 'სათვალეები', 'საათები', 'სამაჯურები'],
    attributes: ['ფერი', 'ბრენდი', 'მასალა'],
  },
  {
    name: 'ელექტრონიკა',
    nameEn: 'Electronics',
    subcategories: ['ტელეფონები', 'ლეპტოპები', 'აქსესუარები', 'აუდიო'],
    attributes: ['ბრენდი', 'მოდელი', 'ფერი'],
  },
  {
    name: 'სახლის ნივთები',
    nameEn: 'Home & Living',
    subcategories: ['სამზარეულო', 'დეკორაცია', 'საძინებელი', 'სააბაზანო'],
    attributes: ['ზომა', 'ფერი', 'მასალა'],
  },
];

// Product templates for seeding
const PRODUCT_TEMPLATES = [
  { name: 'მაისური', nameEn: 'T-Shirt', priceMin: 25, priceMax: 60 },
  { name: 'ჯინსი', nameEn: 'Jeans', priceMin: 70, priceMax: 150 },
  {
    name: 'სპორტული ფეხსაცმელი',
    nameEn: 'Sneakers',
    priceMin: 100,
    priceMax: 250,
  },
  { name: 'ჩანთა', nameEn: 'Bag', priceMin: 50, priceMax: 180 },
  { name: 'საათი', nameEn: 'Watch', priceMin: 120, priceMax: 500 },
  { name: 'სათვალე', nameEn: 'Sunglasses', priceMin: 35, priceMax: 120 },
  { name: 'ქუდი', nameEn: 'Hat', priceMin: 20, priceMax: 50 },
  { name: 'შარფი', nameEn: 'Scarf', priceMin: 25, priceMax: 70 },
  { name: 'ჟაკეტი', nameEn: 'Jacket', priceMin: 150, priceMax: 400 },
  { name: 'პერანგი', nameEn: 'Shirt', priceMin: 45, priceMax: 110 },
  { name: 'ლეპტოპი', nameEn: 'Laptop', priceMin: 800, priceMax: 2500 },
  { name: 'სმარტფონი', nameEn: 'Smartphone', priceMin: 400, priceMax: 1500 },
];

// Tbilisi locations
const TBILISI_LOCATIONS = [
  {
    address: 'Rustaveli Avenue 12',
    city: 'Tbilisi',
    lat: 41.701,
    lng: 44.8015,
  },
  {
    address: 'Chavchavadze Avenue 45',
    city: 'Tbilisi',
    lat: 41.7089,
    lng: 44.773,
  },
  { address: 'Pekini Avenue 20', city: 'Tbilisi', lat: 41.7277, lng: 44.7653 },
  { address: 'Kostava Street 67', city: 'Tbilisi', lat: 41.7165, lng: 44.7847 },
  {
    address: 'Vazha-Pshavela Avenue 33',
    city: 'Tbilisi',
    lat: 41.7337,
    lng: 44.7587,
  },
];

const SHIPPING_SIZES = ['small', 'medium', 'large', 'extra_large'];

@Injectable()
export class DevToolsService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Subcategory.name)
    private subcategoryModel: Model<SubcategoryDocument>,
    @InjectModel(Attribute.name)
    private attributeModel: Model<AttributeDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(BalanceTransaction.name)
    private balanceTransactionModel: Model<BalanceTransactionDocument>,
    @InjectModel(WishlistItem.name)
    private wishlistModel: Model<WishlistItemDocument>,
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @InjectModel(CourierRoute.name)
    private courierRouteModel: Model<CourierRouteDocument>,
  ) {}

  /**
   * Cleanup database based on level
   */
  async cleanup(level: CleanupLevel) {
    const results = { deleted: {}, message: '' };

    switch (level) {
      case CleanupLevel.LEVEL_1: {
        // Clear orders and balance-related data
        const ordersDeleted = await this.orderModel.deleteMany({});
        const balanceDeleted = await this.balanceTransactionModel.deleteMany(
          {},
        );
        const routesDeleted = await this.courierRouteModel.deleteMany({});

        // Reset user balances
        await this.userModel.updateMany(
          {},
          {
            $set: {
              balance: 0,
              totalWithdrawn: 0,
            },
          },
        );

        results.deleted = {
          orders: ordersDeleted.deletedCount,
          balanceTransactions: balanceDeleted.deletedCount,
          courierRoutes: routesDeleted.deletedCount,
          userBalancesReset: true,
        };
        results.message = 'Level 1: Orders and balances cleared';
        break;
      }

      case CleanupLevel.LEVEL_2: {
        // Clear products, categories, attributes, wishlists
        const productsDeleted = await this.productModel.deleteMany({});
        const categoriesDeleted = await this.categoryModel.deleteMany({});
        const subcategoriesDeleted = await this.subcategoryModel.deleteMany({});
        const attributesDeleted = await this.attributeModel.deleteMany({});
        const wishlistsDeleted = await this.wishlistModel.deleteMany({});

        results.deleted = {
          products: productsDeleted.deletedCount,
          categories: categoriesDeleted.deletedCount,
          subcategories: subcategoriesDeleted.deletedCount,
          attributes: attributesDeleted.deletedCount,
          wishlists: wishlistsDeleted.deletedCount,
        };
        results.message =
          'Level 2: Products, categories, and attributes cleared';
        break;
      }

      case CleanupLevel.LEVEL_3: {
        // Nuclear option: Clear users and stores (except admins)
        const usersDeleted = await this.userModel.deleteMany({
          role: { $not: { $bitsAllSet: Role.ADMIN } }, // Never delete admin users
        });
        const storesDeleted = await this.storeModel.deleteMany({});
        const notificationsDeleted = await this.notificationModel.deleteMany(
          {},
        );

        results.deleted = {
          users: usersDeleted.deletedCount,
          stores: storesDeleted.deletedCount,
          notifications: notificationsDeleted.deletedCount,
        };
        results.message =
          'Level 3: Users and stores cleared (all admin users preserved)';
        break;
      }
    }

    return results;
  }

  /**
   * Seed users with different roles
   */
  async seedUsers(dto: SeedUsersDto): Promise<{ users: SeededUser[] }> {
    const count = dto.count || 10;
    const sellers = Math.min(dto.sellers || 3, count);
    const couriers = Math.min(dto.couriers || 2, count);

    const users: SeededUser[] = [];
    const hashedPassword = await bcrypt.hash('password123', 10);

    let userIndex = 1;

    // Seed sellers
    for (let i = 0; i < sellers; i++) {
      const firstName = FIRST_NAMES_KA[userIndex % FIRST_NAMES_KA.length];
      const lastName = LAST_NAMES_KA[userIndex % LAST_NAMES_KA.length];
      const email = `seller${userIndex}@test.ge`;
      const location = TBILISI_LOCATIONS[i % TBILISI_LOCATIONS.length];

      const phoneNumber = `+995 5${Math.floor(10000000 + Math.random() * 90000000)}`;

      const user = await this.userModel.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: Role.SELLER,
        isSeeded: true,
        phoneNumber,
        isProfileComplete: true,
        shippingAddresses: [
          {
            _id: new Types.ObjectId().toString(),
            label: 'Home',
            address: location.address,
            city: location.city,
            country: 'Georgia',
            phoneNumber,
            location: { lat: location.lat, lng: location.lng },
            isDefault: true,
          },
        ],
      });

      // Create store for seller
      const storeName = `${firstName}${i > 0 ? i + 1 : ''} მაღაზია`;
      const subdomain = `seller${userIndex}shop`;

      const store = await this.storeModel.create({
        ownerId: user._id,
        name: storeName,
        subdomain,
        brandColor: '#6366f1',
        accentColor: '#8b5cf6',
        useInitialAsLogo: true,
        isActive: true,
        publishStatus: 'published',
        publishedAt: new Date(),
        address: location.address,
        city: location.city,
        location: { lat: location.lat, lng: location.lng },
        phone: '+995 555 ' + String(100000 + i).padStart(6, '0'),
      });

      users.push({
        id: user._id.toString(),
        email,
        password: 'password123',
        firstName,
        lastName,
        role: 'Seller',
        roleNumber: user.role,
        store: {
          id: store._id.toString(),
          subdomain,
          name: storeName,
        },
      });

      userIndex++;
    }

    // Seed couriers
    for (let i = 0; i < couriers; i++) {
      const firstName = FIRST_NAMES_KA[userIndex % FIRST_NAMES_KA.length];
      const lastName = LAST_NAMES_KA[userIndex % LAST_NAMES_KA.length];
      const email = `courier${userIndex}@test.ge`;
      const location =
        TBILISI_LOCATIONS[(userIndex + i) % TBILISI_LOCATIONS.length];
      const phoneNumber = `+995 5${Math.floor(10000000 + Math.random() * 90000000)}`;

      const user = await this.userModel.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: Role.COURIER,
        isSeeded: true,
        isCourierApproved: true,
        courierAppliedAt: new Date(),
        vehicleType: 'car',
        balance: 0,
        totalWithdrawn: 0,
        phoneNumber,
        isProfileComplete: true,
        shippingAddresses: [
          {
            _id: new Types.ObjectId().toString(),
            label: 'Home',
            address: location.address,
            city: location.city,
            country: 'Georgia',
            phoneNumber,
            location: { lat: location.lat, lng: location.lng },
            isDefault: true,
          },
        ],
      });

      users.push({
        id: user._id.toString(),
        email,
        password: 'password123',
        firstName,
        lastName,
        role: 'Courier',
        roleNumber: user.role,
      });

      userIndex++;
    }

    // Seed regular buyers for the rest
    const buyers = count - sellers - couriers;
    for (let i = 0; i < buyers; i++) {
      const firstName = FIRST_NAMES_KA[userIndex % FIRST_NAMES_KA.length];
      const lastName = LAST_NAMES_KA[userIndex % LAST_NAMES_KA.length];
      const email = `buyer${userIndex}@test.ge`;
      const location =
        TBILISI_LOCATIONS[(userIndex + i) % TBILISI_LOCATIONS.length];
      const phoneNumber = `+995 5${Math.floor(10000000 + Math.random() * 90000000)}`;

      const user = await this.userModel.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: Role.USER,
        isSeeded: true,
        phoneNumber,
        isProfileComplete: true,
        shippingAddresses: [
          {
            _id: new Types.ObjectId().toString(),
            label: 'Home',
            address: location.address,
            city: location.city,
            country: 'Georgia',
            phoneNumber,
            location: { lat: location.lat, lng: location.lng },
            isDefault: true,
          },
        ],
      });

      users.push({
        id: user._id.toString(),
        email,
        password: 'password123',
        firstName,
        lastName,
        role: 'Buyer',
        roleNumber: user.role,
      });

      userIndex++;
    }

    return { users };
  }

  /**
   * Seed products with categories and attributes
   */
  async seedProducts(dto: SeedProductsDto) {
    const count = dto.count || 30;

    // Check if we have stores
    const stores = await this.storeModel
      .find({ isActive: true })
      .limit(10)
      .exec();
    if (stores.length === 0) {
      throw new BadRequestException(
        'No stores found. Please seed users first to create stores.',
      );
    }

    // Clean up existing categories and attributes to avoid duplicates
    await this.categoryModel.deleteMany({});
    await this.subcategoryModel.deleteMany({});
    await this.attributeModel.deleteMany({});
    await this.productModel.deleteMany({});

    // Create attributes once per store (reuse across categories)
    const createdAttributes: Map<string, any> = new Map();
    const allAttributeNames = new Set<string>();

    for (const catTemplate of PRODUCT_CATEGORIES) {
      for (const attrName of catTemplate.attributes) {
        allAttributeNames.add(attrName);
      }
    }

    for (const attrName of allAttributeNames) {
      try {
        const attr = await this.attributeModel.create({
          storeId: stores[0]._id,
          name: attrName,
          nameLocalized: { ka: attrName, en: attrName },
          slug: attrName.toLowerCase().replace(/\s+/g, '-'),
          type: 'text',
          values: [
            {
              value: 'Option 1',
              valueLocalized: { ka: 'ოფცია 1', en: 'Option 1' },
              slug: 'option-1',
              order: 0,
            },
            {
              value: 'Option 2',
              valueLocalized: { ka: 'ოფცია 2', en: 'Option 2' },
              slug: 'option-2',
              order: 1,
            },
            {
              value: 'Option 3',
              valueLocalized: { ka: 'ოფცია 3', en: 'Option 3' },
              slug: 'option-3',
              order: 2,
            },
          ],
        });
        createdAttributes.set(attrName, attr);
      } catch (error) {
        console.error(`Failed to create attribute ${attrName}:`, error);
      }
    }

    // Create categories and attributes first
    const createdCategories: Array<{
      category: CategoryDocument;
      subcategories: SubcategoryDocument[];
    }> = [];
    for (const catTemplate of PRODUCT_CATEGORIES) {
      try {
        const category = await this.categoryModel.create({
          storeId: stores[0]._id, // Use first store for global categories
          name: catTemplate.name,
          nameLocalized: { ka: catTemplate.name, en: catTemplate.nameEn },
          slug: catTemplate.nameEn.toLowerCase().replace(/\s+/g, '-'),
          order: createdCategories.length,
        });

        // Create subcategories
        const subcategories = [];
        for (let i = 0; i < catTemplate.subcategories.length; i++) {
          const subcat = await this.subcategoryModel.create({
            categoryId: category._id,
            name: catTemplate.subcategories[i],
            nameLocalized: {
              ka: catTemplate.subcategories[i],
              en: catTemplate.subcategories[i],
            },
            slug: catTemplate.subcategories[i]
              .toLowerCase()
              .replace(/\s+/g, '-'),
            order: i,
          });
          subcategories.push(subcat);
        }

        createdCategories.push({ category, subcategories });
      } catch (error) {
        console.error(`Failed to create category ${catTemplate.name}:`, error);
        throw new BadRequestException(
          `Failed to create category: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    // Create products
    const products = [];
    for (let i = 0; i < count; i++) {
      try {
        const store = stores[i % stores.length];
        const template =
          PRODUCT_TEMPLATES[
            Math.floor(Math.random() * PRODUCT_TEMPLATES.length)
          ];
        const catData =
          createdCategories[
            Math.floor(Math.random() * createdCategories.length)
          ];

        const price =
          Math.floor(
            Math.random() * (template.priceMax - template.priceMin) +
              template.priceMin,
          ) + 0.99;
        const isOnSale = Math.random() > 0.7;
        const salePrice = isOnSale
          ? Math.round(price * 0.8 * 100) / 100
          : undefined;

        // Use Lorem Picsum for product images
        const imageId = 200 + i; // Different image for each product
        const images = [
          `https://picsum.photos/id/${imageId}/800/800`,
          `https://picsum.photos/id/${imageId + 1}/800/800`,
          `https://picsum.photos/id/${imageId + 2}/800/800`,
        ];

        const product = await this.productModel.create({
          storeId: store._id,
          name: `${template.name} #${i + 1}`,
          nameLocalized: {
            ka: `${template.name} #${i + 1}`,
            en: `${template.nameEn} #${i + 1}`,
          },
          description: `${template.name} - ხარისხიანი პროდუქტი საუკეთესო ფასად`,
          descriptionLocalized: {
            ka: `${template.name} - ხარისხიანი პროდუქტი საუკეთესო ფასად`,
            en: `${template.nameEn} - Quality product at the best price`,
          },
          price,
          salePrice,
          isOnSale,
          images,
          categoryId: catData.category._id,
          stock: Math.floor(Math.random() * 50) + 10,
          hasVariants: false,
          shippingSize: SHIPPING_SIZES[
            Math.floor(Math.random() * SHIPPING_SIZES.length)
          ] as 'small' | 'medium' | 'large' | 'extra_large',
        });

        products.push(product);
      } catch (error) {
        console.error(`Failed to create product ${i + 1}:`, error);
        throw new BadRequestException(
          `Failed to create product: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return {
      productsCreated: products.length,
      categoriesCreated: createdCategories.length,
      storesUsed: stores.length,
    };
  }

  /**
   * Seed orders based on existing products
   */
  async seedOrders(dto: SeedOrdersDto) {
    const count = dto.count || 50;

    // Check prerequisites
    const products = await this.productModel.find({}).limit(100);
    if (products.length === 0) {
      throw new BadRequestException(
        'No products found. Please seed products first.',
      );
    }

    const stores = await this.storeModel.find({});
    if (stores.length === 0) {
      throw new BadRequestException(
        'No stores found. Please seed users first.',
      );
    }

    const users = await this.userModel.find({});
    if (users.length === 0) {
      throw new BadRequestException('No users found. Please seed users first.');
    }

    const couriers = await this.userModel.find({
      role: { $bitsAllSet: Role.COURIER },
    });
    if (couriers.length === 0) {
      throw new BadRequestException(
        'No couriers found. Please seed courier users first.',
      );
    }

    const orders = [];
    for (let i = 0; i < count; i++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const store = stores.find((s) => s._id.equals(product.storeId));

      // Skip if store not found
      if (!store) {
        continue;
      }

      const deliveryLocation =
        TBILISI_LOCATIONS[Math.floor(Math.random() * TBILISI_LOCATIONS.length)];

      const qty = Math.floor(Math.random() * 3) + 1;
      const itemsPrice = product.price * qty;

      // Calculate distance
      const pickupLoc = store.location || { lat: 41.7151, lng: 44.8271 };
      const distance = this.calculateDistance(
        pickupLoc.lat,
        pickupLoc.lng,
        deliveryLocation.lat,
        deliveryLocation.lng,
      );

      const shippingPrice = this.calculateShippingPrice(
        distance,
        product.shippingSize || 'medium',
      );
      const totalPrice = itemsPrice + shippingPrice;

      const createdAt = new Date(
        Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000,
      ); // Random in last 7 days

      const order = await this.orderModel.create({
        user: user._id,
        orderItems: [
          {
            productId: product._id,
            name: product.name,
            nameEn: product.nameLocalized?.en || product.name,
            image: product.images?.[0] || '/images/placeholder.png',
            price: product.price,
            qty,
            storeId: store._id,
            storeName: store.name,
            storeSubdomain: store.subdomain,
            courierType: 'shopit',
            shippingSize: product.shippingSize || 'medium',
          },
        ],
        shippingDetails: {
          address: deliveryLocation.address,
          city: deliveryLocation.city,
          country: 'Georgia',
          phoneNumber: `+995 5${Math.floor(10000000 + Math.random() * 90000000)}`,
        },
        pickupStoreName: store.name,
        pickupAddress: store.address || 'Rustaveli Avenue 1',
        pickupCity: store.city || 'Tbilisi',
        pickupLocation: pickupLoc,
        deliveryLocation: {
          lat: deliveryLocation.lat,
          lng: deliveryLocation.lng,
        },
        recipientName: `${user.firstName} ${user.lastName}`,
        paymentMethod: 'BOG',
        deliveryMethod: 'delivery',
        itemsPrice,
        shippingPrice,
        distanceKm: distance,
        shippingSize: product.shippingSize || 'medium',
        taxPrice: 0,
        totalPrice,
        isPaid: true,
        paidAt: createdAt,
        status: 'ready_for_delivery',
        deliveryDeadline: new Date(
          createdAt.getTime() + 3 * 24 * 60 * 60 * 1000,
        ),
      });

      orders.push(order);
    }

    return {
      ordersCreated: orders.length,
      productsUsed: products.length,
      storesUsed: stores.length,
    };
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Calculate shipping price based on distance and size
   */
  private calculateShippingPrice(
    distance: number,
    shippingSize: string,
  ): number {
    const basePrices: Record<string, number> = {
      small: 3,
      medium: 5,
      large: 7,
      extra_large: 10,
    };
    const perKmRates: Record<string, number> = {
      small: 0.8,
      medium: 1.0,
      large: 1.3,
      extra_large: 1.6,
    };

    const base = basePrices[shippingSize] || 5;
    const rate = perKmRates[shippingSize] || 1.0;

    return Math.round((base + distance * rate) * 100) / 100;
  }

  /**
   * Get current database statistics
   */
  async getStats() {
    const [
      usersCount,
      storesCount,
      productsCount,
      categoriesCount,
      ordersCount,
      balanceTransactionsCount,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.storeModel.countDocuments(),
      this.productModel.countDocuments(),
      this.categoryModel.countDocuments(),
      this.orderModel.countDocuments(),
      this.balanceTransactionModel.countDocuments(),
    ]);

    return {
      users: usersCount,
      stores: storesCount,
      products: productsCount,
      categories: categoriesCount,
      orders: ordersCount,
      balanceTransactions: balanceTransactionsCount,
    };
  }

  /**
   * Get all seeded users
   */
  async getSeededUsers(): Promise<{ users: SeededUser[] }> {
    const seededUsers = await this.userModel.find({ isSeeded: true }).exec();

    const users: SeededUser[] = [];

    for (const user of seededUsers) {
      const userRole = this.getRoleLabel(user.role);
      const userData: SeededUser = {
        id: user._id.toString(),
        email: user.email,
        password: 'password123', // All seeded users have this password
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        roleNumber: user.role,
      };

      // Check if user is a seller and has a store
      if (user.role & Role.SELLER) {
        const store = await this.storeModel
          .findOne({ ownerId: user._id })
          .exec();
        if (store) {
          userData.store = {
            id: store._id.toString(),
            subdomain: store.subdomain,
            name: store.name,
          };
        }
      }

      users.push(userData);
    }

    return { users };
  }

  /**
   * Convert role number to role label
   */
  private getRoleLabel(roleNumber: number): string {
    if (roleNumber & Role.ADMIN) return 'Admin';
    if (roleNumber & Role.SELLER) return 'Seller';
    if (roleNumber & Role.COURIER) return 'Courier';
    if (roleNumber & Role.USER) return 'Buyer';
    return 'Unknown';
  }
}
