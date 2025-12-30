import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
}

export interface UploadOptions {
  folder?: string; // e.g., 'logos', 'products', 'covers'
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
}

const DEFAULT_OPTIONS: UploadOptions = {
  folder: 'uploads',
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
};

@Injectable()
export class UploadService {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {
    this.region =
      this.configService.get<string>('AWS_REGION') || 'eu-central-1';
    this.bucket = this.configService.get<string>('AWS_S3_BUCKET') || '';

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
      },
    });
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    options: UploadOptions = {},
  ): Promise<UploadResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // Validate file size
    if (opts.maxSizeBytes && file.size > opts.maxSizeBytes) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${opts.maxSizeBytes / (1024 * 1024)}MB`,
      );
    }

    // Validate mime type
    if (
      opts.allowedMimeTypes &&
      !opts.allowedMimeTypes.includes(file.mimetype)
    ) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: ${opts.allowedMimeTypes.join(', ')}`,
      );
    }

    // Generate unique filename
    const extension = this.getFileExtension(file.originalname);
    const uniqueFileName = `${uuidv4()}${extension}`;
    const key = opts.folder
      ? `${opts.folder}/${uniqueFileName}`
      : uniqueFileName;

    // Upload to S3
    // Note: ACL is removed because newer S3 buckets have ACLs disabled by default
    // Use bucket policies for public access instead
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await this.s3Client.send(command);

    // Return the public URL
    const url = this.getPublicUrl(key);

    return {
      url,
      key,
      bucket: this.bucket,
    };
  }

  /**
   * Upload multiple files to S3
   */
  async uploadFiles(
    files: Express.Multer.File[],
    options: UploadOptions = {},
  ): Promise<UploadResult[]> {
    const results = await Promise.all(
      files.map((file) => this.uploadFile(file, options)),
    );
    return results;
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.s3Client.send(command);
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(keys: string[]): Promise<void> {
    await Promise.all(keys.map((key) => this.deleteFile(key)));
  }

  /**
   * Get a signed URL for temporary access (useful for private files)
   */
  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  /**
   * Extract key from full URL
   */
  extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Remove leading slash
      return urlObj.pathname.substring(1);
    } catch {
      return null;
    }
  }
}
