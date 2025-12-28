import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new seller (Steps 1-3)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Registration successful' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  @UseInterceptors(FileInterceptor('logoFile'))
  async register(
    @Body() dto: InitialRegisterDto,
    @UploadedFile() logoFile?: Express.Multer.File,
  ) {
    // TODO: Upload logo to cloud storage and get URL
    let logoUrl: string | undefined;
    if (logoFile) {
      // logoUrl = await this.uploadService.uploadFile(logoFile);
      // For now, we'll skip file upload
    }

    const result = await this.authService.register(dto, logoUrl);

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
}

