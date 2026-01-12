import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type StoreDocument = HydratedDocument<Store>;

/**
 * Bilingual text field - supports Georgian (ka) and English (en)
 */
export class BilingualText {
  @Prop({ trim: true })
  ka?: string; // Georgian

  @Prop({ trim: true })
  en?: string; // English
}

@Schema({ timestamps: true, collection: 'stores' })
export class Store {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  subdomain!: string;

  /**
   * Track how many times the subdomain has been changed.
   * First change is free, subsequent changes cost 10 GEL.
   */
  @Prop({ default: 0 })
  subdomainChangeCount!: number;

  // Legacy field for backward compatibility - will be populated from nameLocalized.en or nameLocalized.ka
  @Prop({ required: true, trim: true })
  name!: string;

  // Localized store name
  @Prop({ type: Object })
  nameLocalized?: BilingualText;

  // Legacy field for backward compatibility
  @Prop({ trim: true })
  description?: string;

  // Localized description
  @Prop({ type: Object })
  descriptionLocalized?: BilingualText;

  // About Us - longer description for the about page
  @Prop({ trim: true })
  aboutUs?: string;

  // Localized About Us
  @Prop({ type: Object })
  aboutUsLocalized?: BilingualText;

  @Prop()
  logo?: string; // Store logo URL

  @Prop()
  coverImage?: string;

  @Prop({ default: 'indigo' }) // Brand color name (e.g., 'indigo', 'rose', 'blue')
  brandColor!: string;

  @Prop({ default: '#6366f1' }) // Fallback hex color
  accentColor!: string;

  @Prop({ default: false })
  useInitialAsLogo!: boolean; // Use colored initial instead of logo

  @Prop({ default: true })
  useDefaultCover!: boolean; // Use colored gradient as cover instead of image

  // Legacy field for backward compatibility
  @Prop({ trim: true })
  authorName?: string; // Display name for the store owner

  // Localized author name
  @Prop({ type: Object })
  authorNameLocalized?: BilingualText;

  @Prop({ default: true })
  showAuthorName!: boolean; // Show author name on store homepage

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: false })
  isVerified!: boolean; // Store has been verified by admin

  @Prop({ default: false })
  isFeatured!: boolean; // Featured on homepage

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId!: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  categories!: string[]; // Store categories

  @Prop({ type: Object })
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    tiktok?: string;
  };

  @Prop({ type: Object })
  businessHours?: {
    monday?: { open: string; close: string };
    tuesday?: { open: string; close: string };
    wednesday?: { open: string; close: string };
    thursday?: { open: string; close: string };
    friday?: { open: string; close: string };
    saturday?: { open: string; close: string };
    sunday?: { open: string; close: string };
  };

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop()
  address?: string;

  /**
   * Store location coordinates for delivery distance calculation
   */
  @Prop({ type: Object })
  location?: {
    lat: number;
    lng: number;
  };

  @Prop({ default: false })
  hideAddress?: boolean;

  // Homepage product display order: 'popular', 'newest', 'price_asc', 'price_desc', 'random'
  @Prop({ default: 'popular' })
  homepageProductOrder!: string;

  // ================== SHIPPING SETTINGS ==================
  
  /**
   * Courier type: 'shopit' or 'seller'
   * - 'shopit': ShopIt courier handles delivery (standard shipping fees apply)
   * - 'seller': Seller handles their own delivery (+10 GEL fee per order)
   */
  @Prop({ default: 'shopit' })
  courierType!: string;

  /**
   * Preparation time in days (how long seller needs to prepare item for shipping)
   * This is added to delivery estimates regardless of courier type
   */
  @Prop({ default: 1, min: 0 })
  prepTimeMinDays!: number;

  @Prop({ default: 3, min: 0 })
  prepTimeMaxDays!: number;

  /**
   * For seller-handled delivery: estimated delivery time (added to prep time)
   * Only applicable when courierType is 'seller'
   */
  @Prop({ min: 0 })
  deliveryMinDays?: number;

  @Prop({ min: 0 })
  deliveryMaxDays?: number;

  /**
   * Delivery fee for seller-handled delivery (in GEL)
   * Only applicable when courierType is 'seller'
   */
  @Prop({ default: 0, min: 0 })
  deliveryFee?: number;

  /**
   * Free delivery option for seller-handled delivery
   * When true, deliveryFee is ignored and delivery is free
   */
  @Prop({ default: false })
  freeDelivery?: boolean;

  // ================== PUBLISH STATUS ==================

  /**
   * Store publish status:
   * - 'draft': Store is being set up, not visible to public
   * - 'pending_review': Seller requested to publish, waiting for admin approval
   * - 'published': Store is live and visible to public
   * - 'rejected': Admin rejected the publish request
   */
  @Prop({ default: 'draft' })
  publishStatus!: string;

  /**
   * When the seller requested to publish the store
   */
  @Prop()
  publishRequestedAt?: Date;

  /**
   * When the store was approved and published
   */
  @Prop()
  publishedAt?: Date;

  /**
   * Motivational message from seller (private, only visible to admins)
   */
  @Prop({ trim: true })
  publishMessage?: string;

  /**
   * If rejected, the reason provided by admin
   */
  @Prop({ trim: true })
  publishRejectionReason?: string;

  // ================== SELLER BANK DETAILS ==================
  
  @Prop()
  bankAccountNumber?: string; // IBAN for withdrawals

  @Prop()
  bankAccountHolderName?: string;

  @Prop({ default: 'BAGAGE22' }) // Default to Bank of Georgia
  bankCode?: string; // SWIFT/BIC code
}

export const StoreSchema = SchemaFactory.createForClass(Store);

// Indexes
StoreSchema.index({ ownerId: 1 });
StoreSchema.index({ isActive: 1 });
StoreSchema.index({ isFeatured: 1 });
StoreSchema.index({ publishStatus: 1 });
StoreSchema.index({ name: 'text', description: 'text' }); // Full-text search
