import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { PublishController } from './publish.controller';
import { PublishService } from './publish.service';
import { Store, StoreSchema, User, UserSchema } from '@sellit/api-database';
import { UploadModule } from '../upload/upload.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: User.name, schema: UserSchema },
    ]),
    UploadModule,
    AuthModule,
  ],
  controllers: [StoresController, PublishController],
  providers: [StoresService, PublishService],
  exports: [StoresService, PublishService],
})
export class StoresModule {}


