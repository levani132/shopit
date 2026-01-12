import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserDocument } from '@sellit/api-database';

@ApiTags('wishlist')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user wishlist' })
  @ApiResponse({ status: 200, description: 'Returns user wishlist items' })
  async getWishlist(@CurrentUser() user: UserDocument) {
    const items = await this.wishlistService.getUserWishlist(
      user._id.toString(),
    );

    // Transform for frontend
    return items.map((item) => ({
      _id: item._id,
      productId: item.productId.toString(),
      name: item.name,
      price: item.price,
      salePrice: item.salePrice,
      image: item.image,
      inStock: item.inStock,
      addedAt: item.createdAt,
      store: item.storeSubdomain
        ? {
            _id: item.storeId.toString(),
            name: item.storeName,
            subdomain: item.storeSubdomain,
          }
        : undefined,
    }));
  }

  @Get('count')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wishlist count' })
  @ApiResponse({ status: 200, description: 'Returns wishlist item count' })
  async getWishlistCount(@CurrentUser() user: UserDocument) {
    const count = await this.wishlistService.getWishlistCount(
      user._id.toString(),
    );
    return { count };
  }

  @Get('check/:productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if product is in wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Returns whether product is in wishlist',
  })
  async checkWishlist(
    @CurrentUser() user: UserDocument,
    @Param('productId') productId: string,
  ) {
    const isInWishlist = await this.wishlistService.isInWishlist(
      user._id.toString(),
      productId,
    );
    return { isInWishlist };
  }

  @Post(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({ status: 201, description: 'Product added to wishlist' })
  @ApiResponse({ status: 409, description: 'Product already in wishlist' })
  async addToWishlist(
    @CurrentUser() user: UserDocument,
    @Param('productId') productId: string,
  ) {
    const item = await this.wishlistService.addToWishlist(
      user._id.toString(),
      productId,
    );
    return {
      _id: item._id,
      productId: item.productId.toString(),
      name: item.name,
      addedAt: item.createdAt,
    };
  }

  @Delete(':productId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({ status: 200, description: 'Product removed from wishlist' })
  async removeFromWishlist(
    @CurrentUser() user: UserDocument,
    @Param('productId') productId: string,
  ) {
    await this.wishlistService.removeFromWishlist(
      user._id.toString(),
      productId,
    );
    return { success: true, message: 'Product removed from wishlist' };
  }

  @Post(':productId/toggle')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle product in wishlist' })
  @ApiResponse({
    status: 200,
    description: 'Product added or removed from wishlist',
  })
  async toggleWishlist(
    @CurrentUser() user: UserDocument,
    @Param('productId') productId: string,
  ) {
    const result = await this.wishlistService.toggleWishlist(
      user._id.toString(),
      productId,
    );
    return {
      added: result.added,
      item: result.item
        ? {
            _id: result.item._id,
            productId: result.item.productId.toString(),
            name: result.item.name,
          }
        : undefined,
    };
  }
}

