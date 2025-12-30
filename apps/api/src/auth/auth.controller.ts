import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
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
import { cookieConfig } from '../config/cookie.config';
import { CurrentUser } from '../decorators/current-user.decorator';
import type { UserDocument } from '@sellit/api-database';
import * as crypto from 'crypto';
import 'multer'; // Import for Express.Multer.File types

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * Generate device fingerprint from request headers
   */
  private generateDeviceFingerprint(req: Request): string {
    const components = [
      req.headers['user-agent'] || '',
      req.headers['accept-language'] || '',
      req.ip || '',
      req.headers['accept-encoding'] || '',
    ].join('|');

    return crypto
      .createHash('sha256')
      .update(components)
      .digest('hex')
      .substring(0, 16);
  }

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
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
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
        console.log('📤 Uploading logo...', logoFile.originalname);
        const uploadResult = await this.uploadService.uploadFile(logoFile, {
          folder: 'logos',
          maxSizeBytes: 2 * 1024 * 1024,
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/svg+xml',
            'image/webp',
          ],
        });
        logoUrl = uploadResult.url;
        console.log('✅ Logo uploaded:', logoUrl);
      } catch (error) {
        console.error('❌ Failed to upload logo:', error);
      }
    }

    // Upload cover to S3 if provided
    let coverUrl: string | undefined;
    const coverFile = files?.coverFile?.[0];
    if (coverFile) {
      try {
        console.log('📤 Uploading cover...', coverFile.originalname);
        const uploadResult = await this.uploadService.uploadFile(coverFile, {
          folder: 'covers',
          maxSizeBytes: 10 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
        coverUrl = uploadResult.url;
        console.log('✅ Cover uploaded:', coverUrl);
      } catch (error) {
        console.error('❌ Failed to upload cover:', error);
      }
    }

    // Get device info
    const deviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.headers['user-agent'] || '',
      trusted: false,
    };

    const result = await this.authService.register(
      dto,
      logoUrl,
      coverUrl,
      deviceInfo,
    );

    // Set HTTP-only cookies
    res.cookie(
      cookieConfig.access.name,
      result.tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      result.tokens.refreshToken,
      cookieConfig.refresh.options,
    );
    if (result.tokens.sessionToken) {
      res.cookie(
        cookieConfig.session.name,
        result.tokens.sessionToken,
        cookieConfig.session.options,
      );
    }

    return {
      message: 'Registration successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isProfileComplete: result.user.isProfileComplete,
      },
      store: {
        id: result.store._id,
        subdomain: result.store.subdomain,
        name: result.store.name,
        brandColor: result.store.brandColor,
        coverImage: result.store.coverImage,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Validate credentials first
    const user = await this.authService.validateUser(dto.email, dto.password);

    // Get device info
    const deviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.headers['user-agent'] || '',
      trusted: false,
    };

    // Generate tokens and get store
    const result = await this.authService.login(user, deviceInfo);

    // Set HTTP-only cookies
    res.cookie(
      cookieConfig.access.name,
      result.tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      result.tokens.refreshToken,
      cookieConfig.refresh.options,
    );
    if (result.tokens.sessionToken) {
      res.cookie(
        cookieConfig.session.name,
        result.tokens.sessionToken,
        cookieConfig.session.options,
      );
    }

    return {
      message: 'Login successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isProfileComplete: result.user.isProfileComplete,
      },
      store: result.store
        ? {
            id: result.store._id,
            subdomain: result.store.subdomain,
            name: result.store.name,
            brandColor: result.store.brandColor,
          }
        : null,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Get refresh token from cookie
    const refreshToken = req.cookies?.[cookieConfig.refresh.name];
    if (!refreshToken) {
      return res.status(401).json({ message: 'No refresh token' });
    }

    const deviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.headers['user-agent'] || '',
    };

    const tokens = await this.authService.refresh(refreshToken, deviceInfo);

    // Set new cookies
    res.cookie(
      cookieConfig.access.name,
      tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      tokens.refreshToken,
      cookieConfig.refresh.options,
    );
    if (tokens.sessionToken) {
      res.cookie(
        cookieConfig.session.name,
        tokens.sessionToken,
        cookieConfig.session.options,
      );
    }

    return { success: true };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(
    @CurrentUser() user: UserDocument,
    @Body() body: { logoutAllDevices?: boolean },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const deviceFingerprint = this.generateDeviceFingerprint(req);

    if (body.logoutAllDevices) {
      await this.authService.logout(user._id.toString());
    } else {
      await this.authService.logout(user._id.toString(), {
        fingerprint: deviceFingerprint,
      });
    }

    // Clear cookies
    res.clearCookie(cookieConfig.access.name, {
      ...cookieConfig.access.options,
      maxAge: 0,
    });
    res.clearCookie(cookieConfig.refresh.name, {
      ...cookieConfig.refresh.options,
      maxAge: 0,
    });
    res.clearCookie(cookieConfig.session.name, {
      ...cookieConfig.session.options,
      maxAge: 0,
    });

    return {
      success: true,
      message: body.logoutAllDevices
        ? 'Logged out from all devices'
        : 'Logged out from current device',
    };
  }

  @Post('complete-profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Complete seller profile (Step 4)' })
  @ApiResponse({ status: 200, description: 'Profile completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async completeProfile(
    @CurrentUser() user: UserDocument,
    @Body() dto: CompleteProfileDto,
  ) {
    const updatedUser = await this.authService.completeProfile(
      user._id.toString(),
      dto,
    );

    return {
      message: 'Profile completed successfully',
      user: {
        id: updatedUser._id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phoneNumber: updatedUser.phoneNumber,
        isProfileComplete: updatedUser.isProfileComplete,
      },
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
  async getProfile(@CurrentUser() user: UserDocument) {
    if (!user) {
      return { user: null, store: null };
    }

    const store = await this.authService.getStoreByOwnerId(user._id.toString());

    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
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

  // ============ Device Management ============

  @Get('devices')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user devices' })
  async getUserDevices(@CurrentUser() user: UserDocument) {
    const devices = await this.authService.getUserDevices(user._id.toString());
    return { devices };
  }

  @Post('devices/trust')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Trust current device' })
  async trustDevice(@CurrentUser() user: UserDocument, @Req() req: Request) {
    const deviceFingerprint = this.generateDeviceFingerprint(req);
    await this.authService.trustDevice(user._id.toString(), deviceFingerprint);
    return { success: true, message: 'Device trusted successfully' };
  }

  @Delete('devices/:fingerprint')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a device' })
  async removeDevice(
    @CurrentUser() user: UserDocument,
    @Param('fingerprint') fingerprint: string,
  ) {
    await this.authService.removeDevice(user._id.toString(), fingerprint);
    return { success: true, message: 'Device removed successfully' };
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
    @Req() req: Request & { user: GoogleProfile },
    @Res() res: Response,
  ) {
    try {
      const frontendUrl =
        this.configService.get('FRONTEND_URL') || 'http://localhost:3000';

      const deviceInfo = {
        fingerprint: this.generateDeviceFingerprint(req),
        userAgent: req.headers['user-agent'] || '',
        trusted: false,
      };

      // Check if user exists
      const result = await this.authService.signInWithGoogle(
        {
          email: req.user.email,
          name: req.user.name || 'Google User',
          id: req.user.id,
        },
        deviceInfo,
      );

      if (result) {
        // User exists - set cookies and redirect to dashboard
        res.cookie(
          cookieConfig.access.name,
          result.tokens.accessToken,
          cookieConfig.access.options,
        );
        res.cookie(
          cookieConfig.refresh.name,
          result.tokens.refreshToken,
          cookieConfig.refresh.options,
        );
        if (result.tokens.sessionToken) {
          res.cookie(
            cookieConfig.session.name,
            result.tokens.sessionToken,
            cookieConfig.session.options,
          );
        }

        res.redirect(
          `${frontendUrl}/auth/callback?success=true&hasStore=${!!result.store}`,
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
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'logoFile', maxCount: 1 },
      { name: 'coverFile', maxCount: 1 },
    ]),
  )
  async googleRegister(
    @Body() dto: InitialRegisterDto & { googleId: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @UploadedFiles()
    files?: {
      logoFile?: Express.Multer.File[];
      coverFile?: Express.Multer.File[];
    },
  ) {
    let logoUrl: string | undefined;
    const logoFile = files?.logoFile?.[0];
    if (logoFile) {
      try {
        const uploadResult = await this.uploadService.uploadFile(logoFile, {
          folder: 'logos',
          maxSizeBytes: 2 * 1024 * 1024,
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
      }
    }

    let coverUrl: string | undefined;
    const coverFile = files?.coverFile?.[0];
    if (coverFile) {
      try {
        const uploadResult = await this.uploadService.uploadFile(coverFile, {
          folder: 'covers',
          maxSizeBytes: 10 * 1024 * 1024,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        });
        coverUrl = uploadResult.url;
      } catch (error) {
        console.error('Failed to upload cover:', error);
      }
    }

    const deviceInfo = {
      fingerprint: this.generateDeviceFingerprint(req),
      userAgent: req.headers['user-agent'] || '',
      trusted: false,
    };

    const result = await this.authService.registerWithGoogle(
      dto,
      logoUrl,
      coverUrl,
      deviceInfo,
    );

    // Set HTTP-only cookies
    res.cookie(
      cookieConfig.access.name,
      result.tokens.accessToken,
      cookieConfig.access.options,
    );
    res.cookie(
      cookieConfig.refresh.name,
      result.tokens.refreshToken,
      cookieConfig.refresh.options,
    );
    if (result.tokens.sessionToken) {
      res.cookie(
        cookieConfig.session.name,
        result.tokens.sessionToken,
        cookieConfig.session.options,
      );
    }

    return {
      message: 'Registration successful',
      user: {
        id: result.user._id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isProfileComplete: result.user.isProfileComplete,
      },
      store: {
        id: result.store._id,
        subdomain: result.store.subdomain,
        name: result.store.name,
        brandColor: result.store.brandColor,
      },
    };
  }
}
