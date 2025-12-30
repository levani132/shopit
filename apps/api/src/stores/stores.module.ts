import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoresController } from './stores.controller';
import { StoresService } from './stores.service';
import { Store, StoreSchema } from '@sellit/api-database';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Store.name, schema: StoreSchema }]),
  ],
  controllers: [StoresController],
  providers: [StoresService],
  exports: [StoresService],
})
export class StoresModule {}


