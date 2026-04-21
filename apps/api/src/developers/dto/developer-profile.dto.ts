import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class BilingualTextDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ka?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  en?: string;
}

export class ApplyDeveloperDto {
  @ApiProperty({ example: 'John Developer', description: 'Public display name' })
  @IsNotEmpty({ message: 'Display name is required' })
  @IsString()
  @MaxLength(100)
  displayName!: string;

  @ApiPropertyOptional({ description: 'Bio in Georgian and/or English' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  bio?: BilingualTextDto;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  githubUsername?: string;
}

export class UpdateDeveloperProfileDto {
  @ApiPropertyOptional({ example: 'John Developer' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  displayName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => BilingualTextDto)
  bio?: BilingualTextDto;

  @ApiPropertyOptional({ example: 'https://example.com' })
  @IsOptional()
  @IsUrl({}, { message: 'Website must be a valid URL' })
  website?: string;

  @ApiPropertyOptional({ example: 'johndoe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  githubUsername?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class AdminRejectDeveloperDto {
  @ApiPropertyOptional({ example: 'Incomplete portfolio' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
