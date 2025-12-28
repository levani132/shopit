import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Step 1 & 2: Initial registration DTO
 * Contains store setup and basic auth info
 */
export class InitialRegisterDto {
  // Store Information
  @ApiProperty({ example: 'My Awesome Store', description: 'Store name' })
  @IsNotEmpty({ message: 'Store name is required' })
  @IsString()
  @MaxLength(100)
  storeName: string;

  @ApiProperty({ example: 'indigo', description: 'Brand color name' })
  @IsNotEmpty()
  @IsString()
  brandColor: string;

  @ApiPropertyOptional({ description: 'Use colored initial as logo' })
  @IsOptional()
  @IsBoolean()
  useInitialAsLogo?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Store logo file',
  })
  @IsOptional()
  logoFile?: Express.Multer.File;

  @ApiProperty({ example: 'A great place to shop for unique items', description: 'Store description' })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 'John Doe', description: 'Author/owner display name' })
  @IsNotEmpty({ message: 'Author name is required' })
  @IsString()
  @MaxLength(100)
  authorName: string;

  @ApiPropertyOptional({ description: 'Show author name on homepage' })
  @IsOptional()
  @IsBoolean()
  showAuthorName?: boolean;

  // Auth Information
  @ApiProperty({ example: 'user@example.com', description: 'Email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'SecurePassword123', description: 'Password (6-50 characters)' })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MaxLength(50, { message: 'Password must be less than 50 characters' })
  password: string;
}

/**
 * Step 4: Profile completion DTO
 * Contains personal and banking information
 */
export class CompleteProfileDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsNotEmpty({ message: 'First name is required' })
  @IsString()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsNotEmpty({ message: 'Last name is required' })
  @IsString()
  @MaxLength(50)
  lastName: string;

  @ApiProperty({ example: '+995555123456', description: 'Phone number in Georgian format' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^\+995\d{9}$/, { message: 'Phone must be in Georgian format (+995XXXXXXXXX)' })
  phoneNumber: string;

  @ApiProperty({ example: '01234567890', description: 'Georgian personal ID (11 digits)' })
  @IsNotEmpty({ message: 'ID number is required' })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'ID number must be 11 digits' })
  identificationNumber: string;

  @ApiProperty({ example: 'GE29TB7777777777777777', description: 'Georgian IBAN' })
  @IsNotEmpty({ message: 'IBAN is required' })
  @IsString()
  @Matches(/^GE\d{2}[A-Z]{2}\d{16}$/, { message: 'Invalid Georgian IBAN format' })
  @Transform(({ value }) => value?.toUpperCase().replace(/\s/g, ''))
  accountNumber: string;

  @ApiProperty({ example: 'TBCBGE22', description: 'Bank SWIFT/BIC code' })
  @IsNotEmpty({ message: 'Bank code is required' })
  @IsString()
  beneficiaryBankCode: string;
}

/**
 * Google OAuth registration DTO
 */
export class GoogleRegisterDto {
  @ApiProperty({ description: 'Google OAuth token' })
  @IsNotEmpty()
  @IsString()
  googleToken: string;

  // Store Information
  @ApiProperty({ example: 'My Awesome Store', description: 'Store name' })
  @IsNotEmpty({ message: 'Store name is required' })
  @IsString()
  @MaxLength(100)
  storeName: string;

  @ApiProperty({ example: 'indigo', description: 'Brand color name' })
  @IsNotEmpty()
  @IsString()
  brandColor: string;

  @ApiPropertyOptional({ description: 'Use colored initial as logo' })
  @IsOptional()
  @IsBoolean()
  useInitialAsLogo?: boolean;

  @ApiProperty({ example: 'A great place to shop for unique items', description: 'Store description' })
  @IsNotEmpty({ message: 'Description is required' })
  @IsString()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 'John Doe', description: 'Author/owner display name' })
  @IsNotEmpty({ message: 'Author name is required' })
  @IsString()
  @MaxLength(100)
  authorName: string;

  @ApiPropertyOptional({ description: 'Show author name on homepage' })
  @IsOptional()
  @IsBoolean()
  showAuthorName?: boolean;
}

/**
 * Login DTO
 */
export class LoginDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}

/**
 * Check subdomain availability DTO
 */
export class CheckSubdomainDto {
  @ApiProperty({ example: 'my-store', description: 'Subdomain to check' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Subdomain can only contain lowercase letters, numbers, and hyphens',
  })
  @Transform(({ value }) => value?.toLowerCase().trim())
  subdomain: string;
}

