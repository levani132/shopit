import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { SiteSettingsService } from './site-settings.service';
import {
  User,
  UserSchema,
  Store,
  StoreSchema,
  Order,
  OrderSchema,
  SiteSettings,
  SiteSettingsSchema,
} from '@sellit/api-database';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Store.name, schema: StoreSchema },
      { name: Order.name, schema: OrderSchema },
      { name: SiteSettings.name, schema: SiteSettingsSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [SiteSettingsService],
  exports: [SiteSettingsService],
})
export class AdminModule {}
