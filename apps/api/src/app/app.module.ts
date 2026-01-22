import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { DatabaseModule } from '@shopit/api-database';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { StoresModule } from '../stores/stores.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { AttributesModule } from '../attributes/attributes.module';
import { UploadModule } from '../upload/upload.module';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsModule } from '../payments/payments.module';
import { WishlistModule } from '../wishlist/wishlist.module';
import { AdminModule } from '../admin/admin.module';
import { SettingsModule } from '../settings/settings.module';
import { ContentModule } from '../content/content.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RoutesModule } from '../routes/routes.module';

@Module({
  imports: [
    // Load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // MongoDB connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
      }),
      inject: [ConfigService],
    }),
    // Database schemas
    DatabaseModule,
    // Feature modules
    AuthModule,
    StoresModule,
    CategoriesModule,
    ProductsModule,
    AttributesModule,
    UploadModule,
    OrdersModule,
    PaymentsModule,
    WishlistModule,
    AdminModule,
    SettingsModule,
    ContentModule,
    NotificationsModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
