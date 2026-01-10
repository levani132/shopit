import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { StoresService, UpdateStoreDto } from './stores.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../decorators/current-user.decorator';
import { UploadService } from '../upload/upload.service';
import type { UserDocument } from '@sellit/api-database';
import 'multer';

@ApiTags('stores')
@Controller('stores')
export class StoresController {
  constructor(
    private readonly storesService: StoresService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('my-store')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user\'s store' })
  @ApiResponse({ status: 200, description: 'Store found' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  async getMyStore(@CurrentUser() user: UserDocument) {
    const store = await this.storesService.findByOwnerId(user._id.toString());

    if (!store) {
      throw new NotFoundException('Store not found');
    }

    return {
      _id: store._id,
      subdomain: store.subdomain,
      subdomainChangeCount: store.subdomainChangeCount || 0,
      name: store.name,
      nameLocalized: store.nameLocalized || { ka: '', en: store.name },
      description: store.description,
      descriptionLocalized: store.descriptionLocalized || { ka: '', en: store.description || '' },
      logo: store.logo,
      coverImage: store.coverImage,
      useDefaultCover: store.useDefaultCover ?? true,
      brandColor: store.brandColor || 'indigo',
      accentColor: store.accentColor || '#6366f1',
      useInitialAsLogo: store.useInitialAsLogo ?? false,
      authorName: store.authorName,
      authorNameLocalized: store.authorNameLocalized || { ka: '', en: store.authorName || '' },
      showAuthorName: store.showAuthorName ?? true,
      categories: store.categories || [],
      socialLinks: store.socialLinks,
      phone: store.phone,
      address: store.address,
      isVerified: store.isVerified ?? false,
      homepageProductOrder: store.homepageProductOrder || 'popular',
    };
  }

  @Get('subdomain-info')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subdomain change info for current user\'s store' })
  @ApiResponse({ status: 200, description: 'Subdomain info retrieved' })
  async getSubdomainInfo(@CurrentUser() user: UserDocument) {
    return this.storesService.getSubdomainChangeInfo(user._id.toString());
  }

  @Get('check-subdomain')
  @ApiOperation({ summary: 'Check if a subdomain is available' })
  @ApiResponse({ status: 200, description: 'Availability check result' })
  async checkSubdomainAvailability(@Query('subdomain') subdomain: string) {
    if (!subdomain) {
      return { available: false, error: 'Subdomain is required' };
    }

    // Validate format first
    const validation = this.storesService.validateSubdomain(subdomain);
    if (!validation.valid) {
      return { available: false, error: validation.error };
    }

    // Check availability
    const available = await this.storesService.isSubdomainAvailable(subdomain);
    return { available, error: available ? null : 'This subdomain is already taken' };
  }

  @Post('change-subdomain-free')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change store subdomain (free - first change only)' })
  @ApiResponse({ status: 200, description: 'Subdomain changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid subdomain or free change already used' })
  @ApiResponse({ status: 409, description: 'Subdomain already taken' })
  async changeSubdomainFree(
    @CurrentUser() user: UserDocument,
    @Body() body: { newSubdomain: string },
  ) {
    const result = await this.storesService.changeSubdomainFree(
      user._id.toString(),
      body.newSubdomain,
    );

    return {
      success: true,
      newSubdomain: result.store.subdomain,
      message: 'Subdomain changed for free! Future changes will cost ₾10.',
    };
  }

  @Patch('my-store')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user\'s store' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: 'Store updated successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
    ]),
  )
  async updateMyStore(
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateStoreDto,
    @UploadedFiles()
    files: {
      logoFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    },
  ) {
    let logoUrl: string | undefined;
    let coverUrl: string | undefined;

    // Upload logo if provided
    if (files?.logoFile?.[0]) {
      const uploadResult = await this.uploadService.uploadFile(
        files.logoFile[0],
        {
          folder: 'logos',
          maxSizeBytes: 2 * 1024 * 1024,
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/svg+xml',
            'image/webp',
          ],
        },
      );
      logoUrl = uploadResult.url;
    }

    // Upload cover if provided
    if (files?.coverFile?.[0]) {
      const uploadResult = await this.uploadService.uploadFile(
        files.coverFile[0],
        {
          folder: 'covers',
          maxSizeBytes: 10 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
      );
      coverUrl = uploadResult.url;
    }

    const store = await this.storesService.updateStore(
      user._id.toString(),
      dto,
      logoUrl,
      coverUrl,
    );

    return {
      _id: store._id,
      subdomain: store.subdomain,
      name: store.name,
      nameLocalized: store.nameLocalized || { ka: '', en: store.name },
      description: store.description,
      descriptionLocalized: store.descriptionLocalized || { ka: '', en: store.description || '' },
      logo: store.logo,
      coverImage: store.coverImage,
      useDefaultCover: store.useDefaultCover ?? true,
      brandColor: store.brandColor || 'indigo',
      accentColor: store.accentColor || '#6366f1',
      useInitialAsLogo: store.useInitialAsLogo ?? false,
      authorName: store.authorName,
      authorNameLocalized: store.authorNameLocalized || { ka: '', en: store.authorName || '' },
      showAuthorName: store.showAuthorName ?? true,
      categories: store.categories || [],
      socialLinks: store.socialLinks,
      phone: store.phone,
      address: store.address,
      isVerified: store.isVerified ?? false,
    };
  }

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
      nameLocalized: store.nameLocalized || { ka: store.name, en: store.name },
      description: store.description,
      descriptionLocalized: store.descriptionLocalized || { ka: store.description || '', en: store.description || '' },
      logo: store.logo,
      coverImage: store.coverImage,
      useDefaultCover: store.useDefaultCover ?? true,
      brandColor: store.brandColor || 'indigo',
      accentColor: store.accentColor || '#6366f1',
      useInitialAsLogo: store.useInitialAsLogo ?? false,
      authorName: store.authorName,
      authorNameLocalized: store.authorNameLocalized || { ka: store.authorName || '', en: store.authorName || '' },
      showAuthorName: store.showAuthorName ?? true,
      categories: store.categories || [],
      socialLinks: store.socialLinks,
      phone: store.phone,
      address: store.address,
      isVerified: store.isVerified ?? false,
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
        nameLocalized: store.nameLocalized || { ka: store.name, en: store.name },
        description: store.description,
        descriptionLocalized: store.descriptionLocalized || { ka: store.description || '', en: store.description || '' },
        logo: store.logo,
        coverImage: store.coverImage,
        useDefaultCover: store.useDefaultCover ?? true,
        brandColor: store.brandColor || 'indigo',
        accentColor: store.accentColor || '#6366f1',
        useInitialAsLogo: store.useInitialAsLogo ?? false,
        authorName: store.authorName,
        authorNameLocalized: store.authorNameLocalized || { ka: store.authorName || '', en: store.authorName || '' },
        showAuthorName: store.showAuthorName ?? true,
        categories: store.categories || [],
        socialLinks: store.socialLinks,
        phone: store.phone,
        address: store.address,
        isVerified: store.isVerified ?? false,
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

