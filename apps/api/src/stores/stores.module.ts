import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import {
  Store,
  StoreSchema,
  User,
  UserSchema,
  Product,
  ProductSchema,
  Order,
  OrderSchema,
} from '@shopit/api-database';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Order.name, schema: OrderSchema },
    ]),
    UploadModule,
    AuthModule,
  ],
  controllers: [StoresController, PublishController],
  providers: [StoresService, PublishService],
  exports: [StoresService, PublishService],
})
export class StoresModule {}
