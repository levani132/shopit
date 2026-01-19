import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WishlistItem,
  WishlistItemDocument,
  Product,
  ProductDocument,
  Store,
  StoreDocument,
} from '@shopit/api-database';

@Injectable()
export class WishlistService {
  constructor(
    @InjectModel(WishlistItem.name)
    private wishlistModel: Model<WishlistItemDocument>,
    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
    @InjectModel(Store.name)
    private storeModel: Model<StoreDocument>,
  ) {}

  /**
   * Get all wishlist items for a user
   * Optionally filter by store subdomain
   */
  async getUserWishlist(
    userId: string,
    storeSubdomain?: string,
  ): Promise<WishlistItemDocument[]> {
    const query: any = { userId: new Types.ObjectId(userId) };

    if (storeSubdomain) {
      query.storeSubdomain = storeSubdomain;
    }

    return this.wishlistModel.find(query).sort({ createdAt: -1 }).exec();
  }

  /**
   * Add a product to wishlist
   */
  async addToWishlist(
    userId: string,
    productId: string,
  ): Promise<WishlistItemDocument> {
    // Check if already in wishlist
    const existing = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    // Get product details
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get store details
    const store = await this.storeModel.findById(product.storeId);

    // Calculate stock
    let inStock = false;
    if (product.hasVariants && product.variants && product.variants.length > 0) {
      inStock = product.variants.some((v) => (v.stock || 0) > 0);
    } else {
      inStock = (product.stock || 0) > 0;
    }

    // Get primary image
    let image: string | undefined;
    if (product.images && product.images.length > 0) {
      image = product.images[0];
    } else if (
      product.hasVariants &&
      product.variants &&
      product.variants.length > 0
    ) {
      const variantWithImage = product.variants.find(
        (v) => v.images && v.images.length > 0,
      );
      if (variantWithImage && variantWithImage.images) {
        image = variantWithImage.images[0];
      }
    }

    // Create wishlist item
    const wishlistItem = new this.wishlistModel({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
      storeId: product.storeId,
      name: product.name,
      price: product.price,
      salePrice: product.salePrice,
      image,
      inStock,
      storeName: store?.name,
      storeSubdomain: store?.subdomain,
    });

    return wishlistItem.save();
  }

  /**
   * Remove a product from wishlist
   */
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const result = await this.wishlistModel.deleteOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Product not found in wishlist');
    }
  }

  /**
   * Check if a product is in user's wishlist
   */
  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const item = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });
    return !!item;
  }

  /**
   * Get wishlist count for a user
   */
  async getWishlistCount(userId: string): Promise<number> {
    return this.wishlistModel.countDocuments({
      userId: new Types.ObjectId(userId),
    });
  }

  /**
   * Toggle wishlist status (add if not exists, remove if exists)
   */
  async toggleWishlist(
    userId: string,
    productId: string,
  ): Promise<{ added: boolean; item?: WishlistItemDocument }> {
    const existing = await this.wishlistModel.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });

    if (existing) {
      await this.wishlistModel.deleteOne({ _id: existing._id });
      return { added: false };
    }

    const item = await this.addToWishlist(userId, productId);
    return { added: true, item };
  }
}

