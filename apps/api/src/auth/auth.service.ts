import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument, AuthProvider, Role } from '@sellit/api-database';
import { Store, StoreDocument } from '@sellit/api-database';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  InitialRegisterDto,
  CompleteProfileDto,
  CheckSubdomainDto,
  BuyerRegisterDto,
} from './dto';
import { TokensDto, TokenPayload } from './dto/auth-response.dto';

// Reserved subdomains that cannot be used
const RESERVED_SUBDOMAINS = [
  'www',
  'api',
  'admin',
  'app',
  'mail',
  'ftp',
  'blog',
  'shop',
  'store',
  'test',
  'demo',
  'dev',
  'staging',
  'production',
  'help',
  'support',
  'docs',
  'status',
  'cdn',
  'static',
  'assets',
  'images',
  'img',
  'media',
  'files',
];

interface DeviceInfo {
  fingerprint?: string;
  userAgent?: string;
  trusted?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password
   */
  private async verifyPassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate subdomain from store name
   */
  private generateSubdomain(storeName: string): string {
    return storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
  }

  /**
   * Find available subdomain
   */
  private async findAvailableSubdomain(baseName: string): Promise<string> {
    const subdomain = this.generateSubdomain(baseName);
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? subdomain : `${subdomain}-${suffix}`;

      if (RESERVED_SUBDOMAINS.includes(candidate)) {
        suffix++;
        continue;
      }

      const existing = await this.storeModel.findOne({ subdomain: candidate });
      if (!existing) {
        return candidate;
      }

      suffix++;
      if (suffix > 99) {
        throw new ConflictException(
          'Unable to generate unique subdomain. Please try a different store name.',
        );
      }
    }
  }

  /**
   * Check if subdomain is available
   */
  async checkSubdomain(
    dto: CheckSubdomainDto,
  ): Promise<{ available: boolean; reason?: string }> {
    const { subdomain } = dto;

    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return { available: false, reason: 'reserved' };
    }

    const existing = await this.storeModel.findOne({ subdomain });
    if (existing) {
      return { available: false, reason: 'taken' };
    }

    return { available: true };
  }

  /**
   * Generate tokens (access, refresh, session)
   */
  private async generateTokens(
    user: UserDocument,
    deviceInfo?: DeviceInfo,
  ): Promise<TokensDto> {
    const jti = randomUUID();
    const sessionId = randomUUID();

    const accessSecret =
      this.configService.get('JWT_ACCESS_SECRET') ||
      this.configService.get('JWT_SECRET') ||
      'default-access-secret';
    const refreshSecret =
      this.configService.get('JWT_REFRESH_SECRET') ||
      this.configService.get('JWT_SECRET') ||
      'default-refresh-secret';
    const sessionSecret =
      this.configService.get('JWT_SESSION_SECRET') || accessSecret;

    const [accessToken, refreshToken, sessionToken] = await Promise.all([
      // Access token - 1 hour
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'access',
          sessionId,
        } as TokenPayload,
        {
          expiresIn: '1h',
          secret: accessSecret,
        },
      ),
      // Refresh token - 30 days
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'refresh',
          jti,
          sessionId,
        } as TokenPayload,
        {
          expiresIn: '30d',
          secret: refreshSecret,
        },
      ),
      // Session token - 7 days
      this.jwtService.signAsync(
        {
          sub: user._id.toString(),
          email: user.email,
          role: user.role,
          type: 'session',
          sessionId,
          deviceTrusted: !!deviceInfo?.trusted,
        } as TokenPayload,
        {
          expiresIn: '7d',
          secret: sessionSecret,
        },
      ),
    ]);

    // Update user with session info
    const globalUpdateData: Record<string, unknown> = {
      refreshToken: jti,
      sessionId,
      lastActivity: new Date(),
    };

    // Handle device info
    if (deviceInfo?.fingerprint) {
      const existingUser = await this.userModel.findById(user._id);
      const existingDevice = existingUser?.knownDevices?.find(
        (device) => device.fingerprint === deviceInfo.fingerprint,
      );

      if (existingDevice) {
        await this.userModel.findOneAndUpdate(
          {
            _id: user._id,
            'knownDevices.fingerprint': deviceInfo.fingerprint,
          },
          {
            $set: {
              ...globalUpdateData,
              'knownDevices.$.userAgent': deviceInfo.userAgent,
              'knownDevices.$.lastSeen': new Date(),
              'knownDevices.$.trusted':
                deviceInfo.trusted || existingDevice.trusted,
              'knownDevices.$.sessionId': sessionId,
              'knownDevices.$.refreshToken': refreshToken,
              'knownDevices.$.refreshTokenJti': jti,
              'knownDevices.$.isActive': true,
            },
          },
        );
      } else {
        await this.userModel.findByIdAndUpdate(user._id, {
          ...globalUpdateData,
          $push: {
            knownDevices: {
              fingerprint: deviceInfo.fingerprint,
              userAgent: deviceInfo.userAgent,
              lastSeen: new Date(),
              trusted: deviceInfo.trusted || false,
              sessionId,
              refreshToken,
              refreshTokenJti: jti,
              isActive: true,
            },
          },
        });
      }
    } else {
      await this.userModel.findByIdAndUpdate(user._id, globalUpdateData);
    }

    return {
      accessToken,
      refreshToken,
      sessionToken,
    };
  }

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<UserDocument> {
    const lowercaseEmail = email.toLowerCase();
    const user = await this.userModel.findOne({ email: lowercaseEmail });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return user;
  }

  /**
   * Login user and generate tokens
   */
  async login(
    user: UserDocument,
    deviceInfo?: DeviceInfo,
  ): Promise<{
    user: UserDocument;
    store: StoreDocument | null;
    tokens: TokensDto;
  }> {
    const tokens = await this.generateTokens(user, deviceInfo);
    const store = await this.storeModel.findOne({ ownerId: user._id });

    return { user, store, tokens };
  }

  /**
   * Refresh tokens
   */
  async refresh(
    refreshToken: string,
    deviceInfo?: DeviceInfo,
  ): Promise<TokensDto> {
    try {
      const refreshSecret =
        this.configService.get('JWT_REFRESH_SECRET') ||
        this.configService.get('JWT_SECRET') ||
        'default-refresh-secret';

      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        refreshToken,
        {
          secret: refreshSecret,
        },
      );

      if (payload.type !== 'refresh' || !payload.jti) {
        throw new UnauthorizedException('Invalid token payload');
      }

      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Validate device-specific or global refresh token
      let validDevice = null;
      let deviceTrusted = false;

      if (deviceInfo?.fingerprint) {
        validDevice = user.knownDevices?.find(
          (device) =>
            device.fingerprint === deviceInfo.fingerprint &&
            device.refreshTokenJti === payload.jti &&
            device.isActive,
        );

        if (!validDevice) {
          const deviceByFingerprint = user.knownDevices?.find(
            (device) =>
              device.fingerprint === deviceInfo.fingerprint && device.isActive,
          );

          if (deviceByFingerprint) {
            validDevice = deviceByFingerprint;
          }
        }

        deviceTrusted = validDevice?.trusted || false;
      }

      // Fallback to global refresh token
      if (!validDevice && user.refreshToken === payload.jti) {
        return this.generateTokens(user, {
          ...deviceInfo,
          trusted: deviceTrusted,
        });
      }

      if (validDevice) {
        return this.generateTokens(user, {
          ...deviceInfo,
          trusted: deviceTrusted,
        });
      }

      throw new UnauthorizedException('Invalid refresh token');
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token refresh failed');
    }
  }

  /**
   * Logout user
   */
  async logout(
    userId: string,
    deviceInfo?: { fingerprint?: string; sessionId?: string },
  ): Promise<void> {
    if (deviceInfo?.fingerprint) {
      await this.userModel.findOneAndUpdate(
        {
          _id: userId,
          'knownDevices.fingerprint': deviceInfo.fingerprint,
        },
        {
          $set: {
            'knownDevices.$.isActive': false,
            'knownDevices.$.refreshToken': null,
            'knownDevices.$.refreshTokenJti': null,
          },
        },
      );
    } else if (deviceInfo?.sessionId) {
      await this.userModel.findOneAndUpdate(
        {
          _id: userId,
          'knownDevices.sessionId': deviceInfo.sessionId,
        },
        {
          $set: {
            'knownDevices.$.isActive': false,
            'knownDevices.$.refreshToken': null,
            'knownDevices.$.refreshTokenJti': null,
          },
        },
      );
    } else {
      // Full logout
      await this.userModel.findByIdAndUpdate(userId, {
        refreshToken: null,
        sessionId: null,
        $set: {
          'knownDevices.$[].isActive': false,
          'knownDevices.$[].refreshToken': null,
          'knownDevices.$[].refreshTokenJti': null,
        },
      });
    }
  }

  /**
   * Initial registration (Steps 1-3)
   */
  async register(
    dto: InitialRegisterDto,
    logoUrl?: string,
    coverUrl?: string,
    deviceInfo?: DeviceInfo,
  ): Promise<{
    user: UserDocument;
    store: StoreDocument;
    tokens: TokensDto;
  }> {
    const existingUser = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Debug: Log received DTO values
    console.log('📋 Registration DTO received:', {
      useInitialAsLogo: dto.useInitialAsLogo,
      useInitialAsLogoType: typeof dto.useInitialAsLogo,
      showAuthorName: dto.showAuthorName,
      showAuthorNameType: typeof dto.showAuthorName,
      useDefaultCover: dto.useDefaultCover,
      useDefaultCoverType: typeof dto.useDefaultCover,
    });

    const subdomain = await this.findAvailableSubdomain(dto.storeName);
    const hashedPassword = await this.hashPassword(dto.password);

    const nameParts = dto.authorName.split(' ');
    const firstName = nameParts[0] || dto.authorName;
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = new this.userModel({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      firstName,
      lastName,
      authProvider: AuthProvider.EMAIL,
      role: Role.SELLER,
      isProfileComplete: false,
    });

    await user.save();

    const store = new this.storeModel({
      subdomain,
      name: dto.storeName,
      description: dto.description,
      brandColor: dto.brandColor,
      accentColor: this.brandColorToHex(dto.brandColor),
      useInitialAsLogo: dto.useInitialAsLogo ?? false,
      logo: logoUrl,
      coverImage: coverUrl,
      useDefaultCover: dto.useDefaultCover ?? true,
      authorName: dto.authorName,
      showAuthorName: dto.showAuthorName ?? true,
      ownerId: user._id,
    });

    await store.save();

    const tokens = await this.generateTokens(user, deviceInfo);

    return { user, store, tokens };
  }

  /**
   * Create a store for an existing authenticated user
   * This upgrades a buyer (USER role) to a seller (SELLER role)
   */
  async createStoreForUser(
    userId: string,
    dto: {
      storeName: string;
      brandColor: string;
      description: string;
      authorName: string;
      useInitialAsLogo?: boolean;
      showAuthorName?: boolean;
      useDefaultCover?: boolean;
    },
    logoUrl?: string,
    coverUrl?: string,
  ): Promise<{
    user: UserDocument;
    store: StoreDocument;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has a store
    const existingStore = await this.storeModel.findOne({ ownerId: userId });
    if (existingStore) {
      throw new ConflictException('User already has a store');
    }

    const subdomain = await this.findAvailableSubdomain(dto.storeName);

    const store = new this.storeModel({
      subdomain,
      name: dto.storeName,
      description: dto.description,
      brandColor: dto.brandColor,
      accentColor: this.brandColorToHex(dto.brandColor),
      useInitialAsLogo: dto.useInitialAsLogo ?? false,
      logo: logoUrl,
      coverImage: coverUrl,
      useDefaultCover: dto.useDefaultCover ?? true,
      authorName: dto.authorName,
      showAuthorName: dto.showAuthorName ?? true,
      ownerId: user._id,
    });

    await store.save();

    // Upgrade user role to SELLER if they were a regular USER
    if (user.role === Role.USER) {
      user.role = Role.SELLER;
      user.isProfileComplete = false; // They need to complete seller profile
      await user.save();
    }

    return { user, store };
  }

  /**
   * Register a buyer (simple user registration)
   */
  async registerBuyer(
    dto: BuyerRegisterDto,
    deviceInfo?: DeviceInfo,
  ): Promise<{
    user: UserDocument;
    tokens: TokensDto;
  }> {
    const existingUser = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await this.hashPassword(dto.password);

    const user = new this.userModel({
      email: dto.email.toLowerCase(),
      password: hashedPassword,
      firstName: dto.firstName,
      lastName: dto.lastName,
      authProvider: AuthProvider.EMAIL,
      role: Role.USER,
      isProfileComplete: true, // Buyers don't need profile completion
    });

    await user.save();

    const tokens = await this.generateTokens(user, deviceInfo);

    return { user, tokens };
  }

  /**
   * Complete profile (Step 4)
   */
  async completeProfile(
    userId: string,
    dto: CompleteProfileDto,
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.phoneNumber = dto.phoneNumber;
    user.identificationNumber = dto.identificationNumber;
    user.accountNumber = dto.accountNumber;
    user.beneficiaryBankCode = dto.beneficiaryBankCode;
    user.isProfileComplete = true;

    await user.save();

    return user;
  }

  /**
   * Convert brand color name to hex
   */
  private brandColorToHex(brandColor: string): string {
    const colorMap: Record<string, string> = {
      indigo: '#6366f1',
      rose: '#f43f5e',
      blue: '#3b82f6',
      green: '#22c55e',
      purple: '#a855f7',
      orange: '#f97316',
      black: '#18181b',
    };

    return colorMap[brandColor] || colorMap.indigo;
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<UserDocument | null> {
    return this.userModel.findById(userId);
  }

  /**
   * Get store by owner ID
   */
  async getStoreByOwnerId(ownerId: string): Promise<StoreDocument | null> {
    return this.storeModel.findOne({ ownerId: new Types.ObjectId(ownerId) });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  /**
   * Register with Google OAuth
   */
  async registerWithGoogle(
    dto: {
      storeName: string;
      brandColor: string;
      description: string;
      authorName: string;
      email: string;
      googleId: string;
      useInitialAsLogo?: boolean;
      showAuthorName?: boolean;
      useDefaultCover?: boolean;
    },
    logoUrl?: string,
    coverUrl?: string,
    deviceInfo?: DeviceInfo,
  ): Promise<{
    user: UserDocument;
    store: StoreDocument;
    tokens: TokensDto;
  }> {
    const existingUser = await this.userModel.findOne({
      email: dto.email.toLowerCase(),
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const subdomain = await this.findAvailableSubdomain(dto.storeName);

    const nameParts = dto.authorName.split(' ');
    const firstName = nameParts[0] || dto.authorName;
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = new this.userModel({
      email: dto.email.toLowerCase(),
      googleId: dto.googleId,
      firstName,
      lastName,
      authProvider: AuthProvider.GOOGLE,
      role: Role.SELLER,
      isProfileComplete: false,
    });

    await user.save();

    const store = new this.storeModel({
      subdomain,
      name: dto.storeName,
      description: dto.description,
      brandColor: dto.brandColor,
      accentColor: this.brandColorToHex(dto.brandColor),
      useInitialAsLogo: dto.useInitialAsLogo ?? false,
      logo: logoUrl,
      coverImage: coverUrl,
      useDefaultCover: dto.useDefaultCover ?? true,
      authorName: dto.authorName,
      showAuthorName: dto.showAuthorName ?? true,
      ownerId: user._id,
    });

    await store.save();

    const tokens = await this.generateTokens(user, deviceInfo);

    return { user, store, tokens };
  }

  /**
   * Sign in with Google (for existing users)
   */
  async signInWithGoogle(
    googleData: { email: string; name: string; id: string },
    deviceInfo?: DeviceInfo,
  ): Promise<{
    user: UserDocument;
    store: StoreDocument | null;
    tokens: TokensDto;
  } | null> {
    const email = googleData.email.toLowerCase();
    const existUser = await this.userModel.findOne({ email });

    if (!existUser) {
      return null; // User needs to register
    }

    // Update googleId if not set
    if (!existUser.googleId) {
      existUser.googleId = googleData.id;
      await existUser.save();
    }

    const tokens = await this.generateTokens(existUser, deviceInfo);
    const store = await this.storeModel.findOne({ ownerId: existUser._id });

    return { user: existUser, store, tokens };
  }

  /**
   * Get user's devices
   */
  async getUserDevices(userId: string) {
    const user = await this.userModel.findById(userId).select('knownDevices');
    return user?.knownDevices || [];
  }

  /**
   * Trust a device
   */
  async trustDevice(userId: string, deviceFingerprint: string): Promise<void> {
    await this.userModel.findOneAndUpdate(
      {
        _id: userId,
        'knownDevices.fingerprint': deviceFingerprint,
      },
      {
        $set: { 'knownDevices.$.trusted': true },
      },
    );
  }

  /**
   * Remove a device
   */
  async removeDevice(userId: string, deviceFingerprint: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      $pull: {
        knownDevices: { fingerprint: deviceFingerprint },
      },
    });
  }

  // =============== Address Management ===============

  /**
   * Get user's shipping addresses
   */
  async getUserAddresses(userId: string): Promise<any[]> {
    const user = await this.userModel.findById(userId).select('shippingAddresses');
    return user?.shippingAddresses || [];
  }

  /**
   * Add a new shipping address
   */
  async addUserAddress(
    userId: string,
    addressData: {
      label?: string;
      address: string;
      city: string;
      postalCode?: string;
      country?: string;
      phoneNumber: string;
      isDefault?: boolean;
    },
  ): Promise<any> {
    const newAddress = {
      _id: randomUUID(),
      label: addressData.label || 'Home',
      address: addressData.address,
      city: addressData.city,
      postalCode: addressData.postalCode || '',
      country: addressData.country || 'Georgia',
      phoneNumber: addressData.phoneNumber,
      isDefault: addressData.isDefault || false,
    };

    // If this is the first address or marked as default, unset other defaults
    if (newAddress.isDefault) {
      await this.userModel.findByIdAndUpdate(userId, {
        $set: { 'shippingAddresses.$[].isDefault': false },
      });
    }

    await this.userModel.findByIdAndUpdate(userId, {
      $push: { shippingAddresses: newAddress },
    });

    // If no other addresses exist, make this the default
    const user = await this.userModel.findById(userId).select('shippingAddresses');
    if (user?.shippingAddresses?.length === 1) {
      await this.userModel.findOneAndUpdate(
        { _id: userId, 'shippingAddresses._id': newAddress._id },
        { $set: { 'shippingAddresses.$.isDefault': true } },
      );
      newAddress.isDefault = true;
    }

    return newAddress;
  }

  /**
   * Delete a shipping address
   */
  async deleteUserAddress(userId: string, addressId: string): Promise<void> {
    const user = await this.userModel.findById(userId).select('shippingAddresses');
    const addressToDelete = user?.shippingAddresses?.find(
      (a) => a._id === addressId,
    );

    await this.userModel.findByIdAndUpdate(userId, {
      $pull: { shippingAddresses: { _id: addressId } },
    });

    // If the deleted address was default, set the first remaining as default
    if (addressToDelete?.isDefault) {
      const updatedUser = await this.userModel.findById(userId).select('shippingAddresses');
      if (updatedUser?.shippingAddresses?.length) {
        await this.userModel.findOneAndUpdate(
          { _id: userId, 'shippingAddresses._id': updatedUser.shippingAddresses[0]._id },
          { $set: { 'shippingAddresses.$.isDefault': true } },
        );
      }
    }
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(userId: string, addressId: string): Promise<void> {
    // First, unset all defaults
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { 'shippingAddresses.$[].isDefault': false },
    });

    // Then set the specified address as default
    await this.userModel.findOneAndUpdate(
      { _id: userId, 'shippingAddresses._id': addressId },
      { $set: { 'shippingAddresses.$.isDefault': true } },
    );
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phoneNumber?: string;
      identificationNumber?: string;
      accountNumber?: string;
      beneficiaryBankCode?: string;
    },
  ): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update fields if provided
    if (data.firstName !== undefined) user.firstName = data.firstName;
    if (data.lastName !== undefined) user.lastName = data.lastName;
    if (data.phoneNumber !== undefined) user.phoneNumber = data.phoneNumber;
    if (data.identificationNumber !== undefined) user.identificationNumber = data.identificationNumber;
    if (data.accountNumber !== undefined) user.accountNumber = data.accountNumber;
    if (data.beneficiaryBankCode !== undefined) user.beneficiaryBankCode = data.beneficiaryBankCode;

    // Check if profile is now complete
    const hasRequiredFields = !!(
      user.firstName &&
      user.lastName &&
      user.phoneNumber &&
      user.identificationNumber &&
      user.accountNumber &&
      user.beneficiaryBankCode
    );

    if (hasRequiredFields && !user.isProfileComplete) {
      user.isProfileComplete = true;
    }

    await user.save();
    return user;
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> {
    const user = await this.userModel.findById(userId).select('+password');
    if (!user || !user.password) {
      throw new NotFoundException('User not found or no password set');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return false;
    }

    // Hash and save new password
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return true;
  }
}
