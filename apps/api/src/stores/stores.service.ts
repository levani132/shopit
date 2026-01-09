import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Store, StoreDocument } from '@sellit/api-database';

export interface UpdateStoreDto {
  name?: string;
  nameKa?: string;
  nameEn?: string;
  description?: string;
  descriptionKa?: string;
  descriptionEn?: string;
  authorName?: string;
  authorNameKa?: string;
  authorNameEn?: string;
  brandColor?: string;
  useInitialAsLogo?: boolean;
  useDefaultCover?: boolean;
  showAuthorName?: boolean;
  phone?: string;
  address?: string;
  socialLinks?: string; // JSON string
  homepageProductOrder?: string; // 'popular', 'newest', 'price_asc', 'price_desc', 'random'
}

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
    // Try with ObjectId first, then fall back to string
    try {
      const objectId = new Types.ObjectId(ownerId);
      console.log('[StoresService.findByOwnerId] Searching for ownerId:', ownerId, 'as ObjectId:', objectId);
      const store = await this.storeModel.findOne({ ownerId: objectId });
      console.log('[StoresService.findByOwnerId] Result:', store ? `Found store ${store._id}` : 'Not found');
      return store;
    } catch (error) {
      console.error('[StoresService.findByOwnerId] Error converting to ObjectId:', error);
      // Try with string as fallback
      return this.storeModel.findOne({ ownerId });
    }
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

  async updateStore(
    ownerId: string,
    dto: UpdateStoreDto,
    logoUrl?: string,
    coverUrl?: string,
  ): Promise<StoreDocument> {
    const store = await this.findByOwnerId(ownerId);
    
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Update basic fields
    if (dto.name) store.name = dto.name;
    if (dto.brandColor) store.brandColor = dto.brandColor;
    if (dto.phone !== undefined) store.phone = dto.phone;
    if (dto.address !== undefined) store.address = dto.address;

    // Update localized fields
    if (dto.nameKa || dto.nameEn) {
      store.nameLocalized = {
        ka: dto.nameKa || store.nameLocalized?.ka,
        en: dto.nameEn || store.nameLocalized?.en,
      };
      // Also update legacy name field
      store.name = dto.nameEn || dto.nameKa || store.name;
    }

    if (dto.descriptionKa !== undefined || dto.descriptionEn !== undefined) {
      store.descriptionLocalized = {
        ka: dto.descriptionKa ?? store.descriptionLocalized?.ka,
        en: dto.descriptionEn ?? store.descriptionLocalized?.en,
      };
      // Also update legacy description field
      store.description = dto.descriptionEn || dto.descriptionKa || store.description;
    }

    if (dto.authorNameKa !== undefined || dto.authorNameEn !== undefined) {
      store.authorNameLocalized = {
        ka: dto.authorNameKa ?? store.authorNameLocalized?.ka,
        en: dto.authorNameEn ?? store.authorNameLocalized?.en,
      };
      // Also update legacy authorName field
      store.authorName = dto.authorNameEn || dto.authorNameKa || store.authorName;
    }

    // Update boolean fields
    if (dto.useInitialAsLogo !== undefined) {
      store.useInitialAsLogo = dto.useInitialAsLogo === true || dto.useInitialAsLogo === 'true' as unknown as boolean;
    }
    if (dto.useDefaultCover !== undefined) {
      store.useDefaultCover = dto.useDefaultCover === true || dto.useDefaultCover === 'true' as unknown as boolean;
    }
    if (dto.showAuthorName !== undefined) {
      store.showAuthorName = dto.showAuthorName === true || dto.showAuthorName === 'true' as unknown as boolean;
    }

    // Update social links
    if (dto.socialLinks) {
      try {
        store.socialLinks = JSON.parse(dto.socialLinks);
      } catch {
        // Keep existing social links if parsing fails
      }
    }

    // Update images
    if (logoUrl) {
      store.logo = logoUrl;
      store.useInitialAsLogo = false;
    }
    if (coverUrl) {
      store.coverImage = coverUrl;
      store.useDefaultCover = false;
    }

    // Update homepage product order
    if (dto.homepageProductOrder) {
      const validOrders = ['popular', 'newest', 'price_asc', 'price_desc', 'random'];
      if (validOrders.includes(dto.homepageProductOrder)) {
        store.homepageProductOrder = dto.homepageProductOrder;
      }
    }

    await store.save();
    return store;
  }
}


