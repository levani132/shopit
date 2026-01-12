import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Store,
  StoreDocument,
  User,
  UserDocument,
} from '@sellit/api-database';

export interface UpdateStoreDto {
  name?: string;
  nameKa?: string;
  nameEn?: string;
  description?: string;
  descriptionKa?: string;
  descriptionEn?: string;
  aboutUs?: string;
  aboutUsKa?: string;
  aboutUsEn?: string;
  authorName?: string;
  authorNameKa?: string;
  authorNameEn?: string;
  brandColor?: string;
  useInitialAsLogo?: boolean;
  useDefaultCover?: boolean;
  showAuthorName?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  location?: string; // JSON string with { lat, lng }
  hideAddress?: string; // "true" or "false" from form data
  socialLinks?: string; // JSON string
  homepageProductOrder?: string; // 'popular', 'newest', 'price_asc', 'price_desc', 'random'
  // Delivery settings
  courierType?: string; // 'shopit' or 'seller'
  prepTimeMinDays?: number;
  prepTimeMaxDays?: number;
  deliveryMinDays?: number;
  deliveryMaxDays?: number;
  deliveryFee?: number;
  freeDelivery?: boolean;
}

@Injectable()
export class StoresService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
    if (dto.email !== undefined) store.email = dto.email;
    if (dto.address !== undefined) store.address = dto.address;
    if (dto.location !== undefined) {
      try {
        store.location = JSON.parse(dto.location);
      } catch {
        // Invalid JSON, ignore
      }
    }
    if (dto.hideAddress !== undefined)
      store.hideAddress = dto.hideAddress === 'true';

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

    if (dto.aboutUsKa !== undefined || dto.aboutUsEn !== undefined) {
      store.aboutUsLocalized = {
        ka: dto.aboutUsKa ?? store.aboutUsLocalized?.ka,
        en: dto.aboutUsEn ?? store.aboutUsLocalized?.en,
      };
      // Also update legacy aboutUs field
      store.aboutUs = dto.aboutUsEn || dto.aboutUsKa || store.aboutUs;
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

    // Update delivery settings
    if (dto.courierType !== undefined) {
      const validCourierTypes = ['shopit', 'seller'];
      if (validCourierTypes.includes(dto.courierType)) {
        store.courierType = dto.courierType;
      }
    }
    if (dto.prepTimeMinDays !== undefined) {
      store.prepTimeMinDays = Math.max(0, Number(dto.prepTimeMinDays));
    }
    if (dto.prepTimeMaxDays !== undefined) {
      store.prepTimeMaxDays = Math.max(0, Number(dto.prepTimeMaxDays));
    }
    if (dto.deliveryMinDays !== undefined) {
      store.deliveryMinDays = Math.max(0, Number(dto.deliveryMinDays));
    }
    if (dto.deliveryMaxDays !== undefined) {
      store.deliveryMaxDays = Math.max(0, Number(dto.deliveryMaxDays));
    }
    if (dto.deliveryFee !== undefined) {
      store.deliveryFee = Math.max(0, Number(dto.deliveryFee));
    }
    if (dto.freeDelivery !== undefined) {
      store.freeDelivery = dto.freeDelivery === true || dto.freeDelivery === 'true' as unknown as boolean;
    }

    await store.save();
    return store;
  }

  /**
   * Check if a subdomain is available
   */
  async isSubdomainAvailable(subdomain: string): Promise<boolean> {
    const normalizedSubdomain = subdomain.toLowerCase().trim();
    const existingStore = await this.storeModel.findOne({
      subdomain: normalizedSubdomain,
    });
    return !existingStore;
  }

  /**
   * Validate subdomain format
   */
  validateSubdomain(subdomain: string): { valid: boolean; error?: string } {
    const normalized = subdomain.toLowerCase().trim();

    // Must be at least 3 characters
    if (normalized.length < 3) {
      return { valid: false, error: 'Subdomain must be at least 3 characters' };
    }

    // Must be at most 30 characters
    if (normalized.length > 30) {
      return { valid: false, error: 'Subdomain must be at most 30 characters' };
    }

    // Must start with a letter
    if (!/^[a-z]/.test(normalized)) {
      return { valid: false, error: 'Subdomain must start with a letter' };
    }

    // Must only contain letters, numbers, and hyphens
    if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(normalized) && normalized.length > 1) {
      return {
        valid: false,
        error: 'Subdomain can only contain letters, numbers, and hyphens',
      };
    }

    // Reserved subdomains
    const reserved = [
      'www',
      'api',
      'admin',
      'app',
      'dashboard',
      'store',
      'shop',
      'mail',
      'email',
      'support',
      'help',
      'blog',
      'cdn',
      'assets',
      'static',
      'test',
      'dev',
      'staging',
      'prod',
      'production',
      'couriers',
    ];
    if (reserved.includes(normalized)) {
      return { valid: false, error: 'This subdomain is reserved' };
    }

    return { valid: true };
  }

  /**
   * Change store subdomain (FREE change only - first change)
   * For paid changes, use the payment flow via ServicePaymentService
   */
  async changeSubdomainFree(
    ownerId: string,
    newSubdomain: string,
  ): Promise<{
    store: StoreDocument;
    success: boolean;
  }> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check if this is the first change (free)
    const changeCount = store.subdomainChangeCount || 0;
    if (changeCount >= 1) {
      throw new BadRequestException(
        'Your free subdomain change has been used. Subsequent changes require a payment of ₾10.',
      );
    }

    const normalizedSubdomain = newSubdomain.toLowerCase().trim();

    // Check if it's the same subdomain
    if (store.subdomain === normalizedSubdomain) {
      throw new BadRequestException('New subdomain is the same as current');
    }

    // Validate subdomain format
    const validation = this.validateSubdomain(normalizedSubdomain);
    if (!validation.valid) {
      throw new BadRequestException(validation.error);
    }

    // Check availability
    const isAvailable = await this.isSubdomainAvailable(normalizedSubdomain);
    if (!isAvailable) {
      throw new ConflictException('This subdomain is already taken');
    }

    // Update subdomain (free change)
    store.subdomain = normalizedSubdomain;
    store.subdomainChangeCount = 1;
    await store.save();

    return {
      store,
      success: true,
    };
  }

  /**
   * Get subdomain change info for a store
   */
  async getSubdomainChangeInfo(ownerId: string): Promise<{
    currentSubdomain: string;
    changeCount: number;
    nextChangeCost: number;
    isFreeChangeAvailable: boolean;
  }> {
    const store = await this.findByOwnerId(ownerId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const changeCount = store.subdomainChangeCount || 0;
    const isFreeChangeAvailable = changeCount === 0;
    const nextChangeCost = isFreeChangeAvailable ? 0 : 10;

    return {
      currentSubdomain: store.subdomain,
      changeCount,
      nextChangeCost,
      isFreeChangeAvailable,
    };
  }

  /**
   * Delete a store and update user's role
   */
  async deleteStore(storeId: string, user: UserDocument): Promise<void> {
    const store = await this.storeModel.findById(storeId);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Verify ownership
    if (store.ownerId.toString() !== user._id.toString()) {
      throw new BadRequestException('You can only delete your own store');
    }

    // Delete the store
    await this.storeModel.findByIdAndDelete(storeId);

    // Update user: remove storeId and change role to 'user'
    await this.userModel.findByIdAndUpdate(user._id, {
      $unset: { storeId: 1 },
      $set: { role: 'user' },
    });
  }
}


