import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourierRoute,
  CourierRouteSchema,
  Order,
  OrderSchema,
  User,
  UserSchema,
  RouteCache,
  RouteCacheSchema,
} from '@shopit/api-database';
import { RoutesController } from './routes.controller';
import { AnalyticsController } from './analytics.controller';
import { RoutesService } from './routes.service';
import { AdminModule } from '../admin/admin.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourierRoute.name, schema: CourierRouteSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: RouteCache.name, schema: RouteCacheSchema },
    ]),
    AdminModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [RoutesController, AnalyticsController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
