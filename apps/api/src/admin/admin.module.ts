import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { PublicSettingsController } from './public-settings.controller';
import { DevToolsController } from './dev-tools.controller';
import { SiteSettingsService } from './site-settings.service';
import { DevToolsService } from './dev-tools.service';
import {
  User,
  UserSchema,
  Store,
  StoreSchema,
  Order,
  OrderSchema,
  SiteSettings,
  SiteSettingsSchema,
  Product,
  ProductSchema,
  Category,
  CategorySchema,
  Subcategory,
  SubcategorySchema,
  Attribute,
  AttributeSchema,
  BalanceTransaction,
  BalanceTransactionSchema,
  WishlistItem,
  WishlistItemSchema,
  Notification,
  NotificationSchema,
  CourierRoute,
  CourierRouteSchema,
  RouteCache,
  RouteCacheSchema,
} from '@shopit/api-database';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Store.name, schema: StoreSchema },
      { name: Order.name, schema: OrderSchema },
      { name: SiteSettings.name, schema: SiteSettingsSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Subcategory.name, schema: SubcategorySchema },
      { name: Attribute.name, schema: AttributeSchema },
      { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
      { name: WishlistItem.name, schema: WishlistItemSchema },
      { name: Notification.name, schema: NotificationSchema },
      { name: CourierRoute.name, schema: CourierRouteSchema },
      { name: RouteCache.name, schema: RouteCacheSchema },
    ]),
    forwardRef(() => OrdersModule),
    NotificationsModule,
  ],
  controllers: [AdminController, PublicSettingsController, DevToolsController],
  providers: [SiteSettingsService, DevToolsService],
  exports: [SiteSettingsService],
})
export class AdminModule {}
