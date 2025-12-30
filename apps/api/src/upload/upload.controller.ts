import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UploadService, UploadResult } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a single image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.uploadFile(file, {
      folder: folder || 'images',
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });
  }

  @Post('logo')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a store logo' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Logo uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.uploadFile(file, {
      folder: 'logos',
      maxSizeBytes: 2 * 1024 * 1024, // 2MB for logos
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
    });
  }

  @Post('product')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload product images' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Product images uploaded successfully' })
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 images per product
  async uploadProductImages(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.uploadService.uploadFiles(files, {
      folder: 'products',
      maxSizeBytes: 5 * 1024 * 1024, // 5MB per image
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  }

  @Post('cover')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a store cover image' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Cover image uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCoverImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.uploadService.uploadFile(file, {
      folder: 'covers',
      maxSizeBytes: 10 * 1024 * 1024, // 10MB for cover images
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  }

  @Delete(':key')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an uploaded file' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  async deleteFile(@Param('key') key: string): Promise<{ success: boolean }> {
    // Decode the key (it might be URL encoded)
    const decodedKey = decodeURIComponent(key);
    await this.uploadService.deleteFile(decodedKey);
    return { success: true };
  }
}


