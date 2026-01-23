import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CourierRoute,
  CourierRouteSchema,
  Order,
  OrderSchema,
  User,
  UserSchema,
} from '@shopit/api-database';
import { RoutesController } from './routes.controller';
import { RoutesService } from './routes.service';
import { AdminModule } from '../admin/admin.module';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CourierRoute.name, schema: CourierRouteSchema },
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AdminModule,
    forwardRef(() => OrdersModule),
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService],
})
export class RoutesModule {}
