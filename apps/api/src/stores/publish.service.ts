import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Store, StoreDocument, User, UserDocument } from '@sellit/api-database';

/**
 * Validate Georgian IBAN
 * Format: GE + 2 check digits + 2 letter bank code + 16 alphanumeric characters = 22 chars total
 * Example: GE29TB7777777777777777
 */
function isValidGeorgianIban(iban: string | undefined): boolean {
  if (!iban) return false;
  const cleaned = iban.replace(/\s/g, '').toUpperCase();
  // Georgian IBAN: GE + 20 alphanumeric characters = 22 total
  return /^GE\d{2}[A-Z]{2}[A-Z0-9]{16}$/.test(cleaned);
}

/**
 * Validate Georgian phone number
 * Accepts:
 * - Full international: +995XXXXXXXXX (12 chars total, 9 digits after +995)
 * - Local format: 5XXXXXXXX (9 digits starting with 5)
 * - With spaces/dashes: +995 555 123 456, 555-123-456, etc.
 */
function isValidGeorgianPhone(phone: string | undefined): boolean {
  if (!phone) return false;

  // Remove all spaces, dashes, and parentheses
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  // Check for international format: +995 followed by 9 digits starting with 5
  if (cleaned.startsWith('+995')) {
    const localPart = cleaned.slice(4);
    return /^5\d{8}$/.test(localPart);
  }

  // Check for local format: 9 digits starting with 5
  if (/^5\d{8}$/.test(cleaned)) {
    return true;
  }

  // Also accept 995 without + prefix
  if (cleaned.startsWith('995')) {
    const localPart = cleaned.slice(3);
    return /^5\d{8}$/.test(localPart);
  }

  return false;
}

/**
 * Required fields for publishing a store
 */
export interface PublishRequirements {
  // Profile requirements
  profile: {
    firstName: boolean;
    lastName: boolean;
    phone: boolean;
  };
  // Store requirements
  store: {
    name: boolean;
    description: boolean;
    address: boolean;
    location: boolean;
    phone: boolean;
    courierType: boolean;
  };
}

/**
 * Missing fields result
 */
export interface MissingFields {
  profile: string[];
  store: string[];
  canPublish: boolean;
}

@Injectable()
export class PublishService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Check what fields are missing for publishing
   */
  async checkMissingFields(userId: string): Promise<MissingFields> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find store by ownerId (stores have ownerId pointing to user)
    // ownerId is stored as ObjectId, so we need to convert the string
    const store = await this.storeModel.findOne({
      ownerId: new Types.ObjectId(userId),
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const missingProfile: string[] = [];
    const missingStore: string[] = [];

    // Check profile requirements
    if (!user.firstName?.trim()) missingProfile.push('firstName');
    if (!user.lastName?.trim()) missingProfile.push('lastName');
    if (!isValidGeorgianPhone(user.phoneNumber)) missingProfile.push('phone');
    if (!user.identificationNumber?.trim() || user.identificationNumber.length !== 11) {
      missingProfile.push('idNumber');
    }
    if (!isValidGeorgianIban(user.accountNumber)) missingProfile.push('bankAccount');

    // Check store requirements
    // Logo: either uploaded OR useInitialAsLogo is checked
    if (!store.logo && !store.useInitialAsLogo) missingStore.push('logo');
    // Cover: either uploaded OR useDefaultCover is checked
    if (!store.coverImage && !store.useDefaultCover) missingStore.push('cover');
    // Store name required in BOTH languages
    if (!store.nameLocalized?.ka?.trim()) missingStore.push('nameKa');
    if (!store.nameLocalized?.en?.trim()) missingStore.push('nameEn');
    // Phone and address
    if (!isValidGeorgianPhone(store.phone)) missingStore.push('phone');
    if (!store.address?.trim()) missingStore.push('address');

    const canPublish = missingProfile.length === 0 && missingStore.length === 0;

    return {
      profile: missingProfile,
      store: missingStore,
      canPublish,
    };
  }

  /**
   * Request to publish a store
   */
  async requestPublish(
    userId: string,
    message: string,
  ): Promise<StoreDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find store by ownerId (stores have ownerId pointing to user)
    // ownerId is stored as ObjectId, so we need to convert the string
    const store = await this.storeModel.findOne({
      ownerId: new Types.ObjectId(userId),
    });
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    // Check if already published or in review
    if (store.publishStatus === 'published') {
      throw new BadRequestException('Store is already published');
    }
    if (store.publishStatus === 'pending_review') {
      throw new BadRequestException('Store is already pending review');
    }

    // Check if all required fields are filled
    const missingFields = await this.checkMissingFields(userId);
    if (!missingFields.canPublish) {
      throw new BadRequestException({
        message: 'Cannot publish store. Missing required fields.',
        missingFields,
      });
    }

    // Update store status
    store.publishStatus = 'pending_review';
    store.publishRequestedAt = new Date();
    store.publishMessage = message;
    store.publishRejectionReason = undefined;

    await store.save();
    return store;
  }

  /**
   * Admin: Approve a store publish request
   */
  async approvePublish(storeId: string): Promise<StoreDocument> {
    const store = await this.storeModel.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.publishStatus !== 'pending_review') {
      throw new BadRequestException('Store is not pending review');
    }

    store.publishStatus = 'published';
    store.publishedAt = new Date();
    store.isActive = true;

    await store.save();
    return store;
  }

  /**
   * Admin: Reject a store publish request
   */
  async rejectPublish(storeId: string, reason: string): Promise<StoreDocument> {
    const store = await this.storeModel.findById(storeId);
    if (!store) {
      throw new NotFoundException('Store not found');
    }

    if (store.publishStatus !== 'pending_review') {
      throw new BadRequestException('Store is not pending review');
    }

    store.publishStatus = 'rejected';
    store.publishRejectionReason = reason;

    await store.save();
    return store;
  }

  /**
   * Get stores pending review (admin)
   */
  async getPendingStores(): Promise<StoreDocument[]> {
    return this.storeModel
      .find({ publishStatus: 'pending_review' })
      .sort({ publishRequestedAt: 1 })
      .populate('owner', 'firstName lastName email phone');
  }

  /**
   * Validate that required fields cannot be removed after publishing
   */
  async validateUpdateAfterPublish(
    storeId: string,
    updateData: Partial<Store>,
  ): Promise<void> {
    const store = await this.storeModel.findById(storeId);
    if (!store || store.publishStatus !== 'published') {
      return; // Only validate for published stores
    }

    const errors: string[] = [];

    // Check if trying to remove required fields
    if (updateData.name !== undefined && !updateData.name?.trim()) {
      errors.push('Store name cannot be removed after publishing');
    }
    if (updateData.address !== undefined && !updateData.address?.trim()) {
      errors.push('Store address cannot be removed after publishing');
    }
    if (updateData.phone !== undefined && !updateData.phone?.trim()) {
      errors.push('Store phone cannot be removed after publishing');
    }

    if (errors.length > 0) {
      throw new BadRequestException({
        message: 'Cannot remove required fields from published store',
        errors,
      });
    }
  }
}
