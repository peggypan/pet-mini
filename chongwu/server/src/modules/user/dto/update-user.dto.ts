import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  nickname?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsNumber()
  gender?: number;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateAddressDto {
  @IsString()
  contactName: string;

  @IsString()
  contactPhone: string;

  @IsString()
  province: string;

  @IsString()
  city: string;

  @IsString()
  district: string;

  @IsString()
  detail: string;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  tag?: string;
}
