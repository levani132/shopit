import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, AuthProvider } from '@sellit/api-database';
import { Store, StoreDocument } from '@sellit/api-database';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import {
  InitialRegisterDto,
  CompleteProfileDto,
  LoginDto,
  CheckSubdomainDto,
} from './dto';

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

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private jwtService: JwtService,
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
    let subdomain = this.generateSubdomain(baseName);
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? subdomain : `${subdomain}-${suffix}`;

      // Check if reserved
      if (RESERVED_SUBDOMAINS.includes(candidate)) {
        suffix++;
        continue;
      }

      // Check if exists in database
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
  async checkSubdomain(dto: CheckSubdomainDto): Promise<{ available: boolean; reason?: string }> {
    const { subdomain } = dto;

    // Check if reserved
    if (RESERVED_SUBDOMAINS.includes(subdomain)) {
      return { available: false, reason: 'reserved' };
    }

    // Check if exists
    const existing = await this.storeModel.findOne({ subdomain });
    if (existing) {
      return { available: false, reason: 'taken' };
    }

    return { available: true };
  }

  /**
   * Initial registration (Steps 1-3)
   */
  async register(
    dto: InitialRegisterDto,
    logoUrl?: string,
  ): Promise<{ user: UserDocument; store: StoreDocument; accessToken: string }> {
    // Check if email already exists
    const existingUser = await this.userModel.findOne({ email: dto.email });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Generate subdomain
    const subdomain = await this.findAvailableSubdomain(dto.storeName);

    // Hash password
    const hashedPassword = await this.hashPassword(dto.password);

    // Split author name into first/last for initial user
    const nameParts = dto.authorName.split(' ');
    const firstName = nameParts[0] || dto.authorName;
    const lastName = nameParts.slice(1).join(' ') || '';

    // Create user
    const user = new this.userModel({
      email: dto.email,
      password: hashedPassword,
      firstName,
      lastName,
      authProvider: AuthProvider.EMAIL,
      isProfileComplete: false,
    });

    await user.save();

    // Create store
    const store = new this.storeModel({
      subdomain,
      name: dto.storeName,
      description: dto.description,
      brandColor: dto.brandColor,
      accentColor: this.brandColorToHex(dto.brandColor),
      useInitialAsLogo: dto.useInitialAsLogo ?? false,
      logo: logoUrl,
      authorName: dto.authorName,
      showAuthorName: dto.showAuthorName ?? true,
      ownerId: user._id,
    });

    await store.save();

    // Generate JWT
    const accessToken = this.generateToken(user);

    return { user, store, accessToken };
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

    // Update user with profile information
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
   * Login with email and password
   */
  async login(dto: LoginDto): Promise<{ user: UserDocument; accessToken: string }> {
    const user = await this.userModel.findOne({ email: dto.email });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.verifyPassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = this.generateToken(user);

    return { user, accessToken };
  }

  /**
   * Generate JWT token
   */
  private generateToken(user: UserDocument): string {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
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
    return this.storeModel.findOne({ ownerId });
  }
}

