import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CourierAdminController } from './courier-admin.controller';
import { CourierAdminService } from './courier-admin.service';
import {
  User,
  UserSchema,
  Order,
  OrderSchema,
  CourierRoute,
  CourierRouteSchema,
} from '@shopit/api-database';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Order.name, schema: OrderSchema },
      { name: CourierRoute.name, schema: CourierRouteSchema },
    ]),
  ],
  controllers: [CourierAdminController],
  providers: [CourierAdminService],
  exports: [CourierAdminService],
})
export class CourierAdminModule {}
