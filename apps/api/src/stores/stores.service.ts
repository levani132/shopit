import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Store, StoreDocument } from '@sellit/api-database';

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
  ) {}

  async findBySubdomain(subdomain: string): Promise<StoreDocument | null> {
    return this.storeModel.findOne({
      subdomain: subdomain.toLowerCase(),
      isActive: true,
    });
  }

  async findById(id: string): Promise<StoreDocument | null> {
    return this.storeModel.findById(id);
  }

  async findByOwnerId(ownerId: string): Promise<StoreDocument | null> {
    return this.storeModel.findOne({ ownerId });
  }

  async getStoreProducts(storeId: string): Promise<any[]> {
    // TODO: Implement when Product model is created
    // For now, return empty array
    return [];
  }

  async getFeaturedStores(limit = 6): Promise<StoreDocument[]> {
    return this.storeModel
      .find({ isActive: true, isFeatured: true })
      .limit(limit)
      .sort({ createdAt: -1 });
  }

  async getAllActiveStores(
    page = 1,
    limit = 20,
  ): Promise<{ stores: StoreDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [stores, total] = await Promise.all([
      this.storeModel
        .find({ isActive: true })
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      this.storeModel.countDocuments({ isActive: true }),
    ]);

    return { stores, total };
  }
}

