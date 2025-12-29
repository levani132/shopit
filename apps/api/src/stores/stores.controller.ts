import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StoresService } from './stores.service';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get('subdomain/:subdomain')
  @ApiOperation({ summary: 'Get store by subdomain' })
  @ApiResponse({ status: 200, description: 'Store found' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreBySubdomain(@Param('subdomain') subdomain: string) {
    const store = await this.storesService.findBySubdomain(subdomain);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return {
      id: store._id,
      subdomain: store.subdomain,
      name: store.name,
      description: store.description,
      logo: store.logo,
      coverImage: store.coverImage,
      brandColor: store.brandColor,
      accentColor: store.accentColor,
      useInitialAsLogo: store.useInitialAsLogo,
      authorName: store.authorName,
      showAuthorName: store.showAuthorName,
      categories: store.categories,
      socialLinks: store.socialLinks,
      phone: store.phone,
      address: store.address,
      isVerified: store.isVerified,
    };
  }

  @Get('subdomain/:subdomain/full')
  @ApiOperation({ summary: 'Get store with products by subdomain' })
  @ApiResponse({ status: 200, description: 'Store with products found' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreWithProducts(@Param('subdomain') subdomain: string) {
    const store = await this.storesService.findBySubdomain(subdomain);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    const products = await this.storesService.getStoreProducts(
      store._id.toString(),
    );

    return {
      store: {
        id: store._id,
        subdomain: store.subdomain,
        name: store.name,
        description: store.description,
        logo: store.logo,
        coverImage: store.coverImage,
        brandColor: store.brandColor,
        accentColor: store.accentColor,
        useInitialAsLogo: store.useInitialAsLogo,
        authorName: store.authorName,
        showAuthorName: store.showAuthorName,
        categories: store.categories,
        socialLinks: store.socialLinks,
        phone: store.phone,
        address: store.address,
        isVerified: store.isVerified,
      },
      products,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get store by ID' })
  @ApiResponse({ status: 200, description: 'Store found' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getStoreById(@Param('id') id: string) {
    const store = await this.storesService.findById(id);

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return {
      id: store._id,
      subdomain: store.subdomain,
      name: store.name,
      description: store.description,
      logo: store.logo,
      brandColor: store.brandColor,
      accentColor: store.accentColor,
      categories: store.categories,
      isVerified: store.isVerified,
    };
  }
}

