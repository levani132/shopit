import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import {
  Order,
  OrderSchema,
  Product,
  ProductSchema,
  Store,
  StoreSchema,
  User,
  UserSchema,
  BalanceTransaction,
  BalanceTransactionSchema,
} from '@sellit/api-database';
import { OrdersController } from './orders.controller';
import { BalanceController } from './balance.controller';
import { OrdersService } from './orders.service';
import { StockReservationService } from './stock-reservation.service';
import { BalanceService } from './balance.service';
import { DeliveryFeeService } from './delivery-fee.service';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Store.name, schema: StoreSchema },
      { name: User.name, schema: UserSchema },
      { name: BalanceTransaction.name, schema: BalanceTransactionSchema },
    ]),
    ScheduleModule.forRoot(),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [OrdersController, BalanceController],
  providers: [OrdersService, StockReservationService, BalanceService, DeliveryFeeService],
  exports: [OrdersService, StockReservationService, BalanceService, DeliveryFeeService],
})
export class OrdersModule {}

