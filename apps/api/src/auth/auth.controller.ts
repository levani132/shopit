import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  FileInterceptor,
  FileFieldsInterceptor,
} from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  InitialRegisterDto,
  CompleteProfileDto,
  LoginDto,
  CheckSubdomainDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';
import { UploadService } from '../upload/upload.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new seller (Steps 1-3)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
    ]),
  )
  async register(
    @Body() dto: InitialRegisterDto,
    @UploadedFiles()
    files?: {
      logoFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    },
  ) {
    // Upload logo to S3 if provided
    let logoUrl: string | undefined;
    const logoFile = files?.logoFile?.[0];
    if (logoFile) {
      try {
        const uploadResult = await this.uploadService.uploadFile(logoFile, {
          folder: 'logos',
          maxSizeBytes: 2 * 1024 * 1024, // 2MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/svg+xml',
            'image/webp',
          ],
        });
        logoUrl = uploadResult.url;
      } catch (error) {
        console.error('Failed to upload logo:', error);
        // Continue without logo if upload fails
      }
    }

    // Upload cover to S3 if provided
    let coverUrl: string | undefined;
    const coverFile = files?.coverFile?.[0];
    if (coverFile) {
      try {
        const uploadResult = await this.uploadService.uploadFile(coverFile, {
          folder: 'covers',
          maxSizeBytes: 10 * 1024 * 1024, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
        coverUrl = uploadResult.url;
      } catch (error) {
        console.error('Failed to upload cover:', error);
        // Continue without cover if upload fails
      }
    }

    const result = await this.authService.register(dto, logoUrl, coverUrl);

    return {
      message: 'Registration successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isProfileComplete: result.user.isProfileComplete,
      },
      store: {
        id: result.store._id,
        subdomain: result.store.subdomain,
        name: result.store.name,
        brandColor: result.store.brandColor,
        coverImage: result.store.coverImage,
      },
      accessToken: result.accessToken,
    };
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete seller profile (Step 4)' })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeProfile(
    @Request() req: { user: { sub: string } },
    @Body() dto: CompleteProfileDto,
  ) {
    const user = await this.authService.completeProfile(req.user.sub, dto);

    return {
      message: 'Profile completed successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);

    const store = await this.authService.getStoreByOwnerId(
      result.user._id.toString(),
    );

    return {
      message: 'Login successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isProfileComplete: result.user.isProfileComplete,
      },
      store: store
        ? {
            id: store._id,
            subdomain: store.subdomain,
            name: store.name,
            brandColor: store.brandColor,
          }
        : null,
      accessToken: result.accessToken,
    };
  }

  @Get('check-subdomain/:subdomain')
  @ApiOperation({ summary: 'Check if subdomain is available' })
  @ApiResponse({ status: 200, description: 'Subdomain availability result' })
  async checkSubdomain(@Param() params: CheckSubdomainDto) {
    return this.authService.checkSubdomain(params);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Request() req: { user: { sub: string } }) {
    const user = await this.authService.getUserById(req.user.sub);

    if (!user) {
      return { user: null, store: null };
    }

    const store = await this.authService.getStoreByOwnerId(
      user._id.toString(),
    );

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        isProfileComplete: user.isProfileComplete,
      },
      store: store
        ? {
            id: store._id,
            subdomain: store.subdomain,
            name: store.name,
            brandColor: store.brandColor,
            description: store.description,
          }
        : null,
    };
  }

  // ============ Google OAuth ============

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google OAuth flow' })
  async googleAuth() {
    // Guard redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(
    @Request() req: { user: GoogleProfile },
    @Res() res: Response,
  ) {
    try {
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      // Check if user exists, if not this is just auth - they need to complete registration
      const existingUser = await this.authService.findUserByEmail(
        req.user.email,
      );

      if (existingUser) {
        // User exists - log them in
        const store = await this.authService.getStoreByOwnerId(
          existingUser._id.toString(),
        );

        const accessToken = await this.authService.generateTokenForUser(
          existingUser,
        );

        // Redirect to frontend with token
        res.redirect(
          `${frontendUrl}/auth/callback?token=${accessToken}&hasStore=${!!store}`,
        );
      } else {
        // New user - redirect to registration with Google data
        const googleData = Buffer.from(JSON.stringify(req.user)).toString(
          'base64',
        );
        res.redirect(`${frontendUrl}/register?google=${googleData}`);
      }
    } catch (error) {
      console.error('Google auth callback error:', error);
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
      res.redirect(`${frontendUrl}/register?error=auth_failed`);
    }
  }

  @Post('google/register')
  @ApiOperation({ summary: 'Complete registration for Google user' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @UseInterceptors(FileInterceptor('logoFile'))
  async googleRegister(
    @Body() dto: InitialRegisterDto & { googleId: string },
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    let logoUrl: string | undefined;
    if (logoFile) {
      // TODO: Upload logo to cloud storage
    }

    const result = await this.authService.registerWithGoogle(dto, logoUrl);

    return {
      message: 'Registration successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        isProfileComplete: result.user.isProfileComplete,
      },
      store: {
        id: result.store._id,
        subdomain: result.store.subdomain,
        name: result.store.name,
        brandColor: result.store.brandColor,
      },
      accessToken: result.accessToken,
    };
  }
}

