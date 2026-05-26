import { IsString, IsNumber, IsOptional, IsArray } from 'class-validator';

export class CreateMerchantDto {
  @IsString()
  name: string;

  @IsNumber()
  type: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  contactName?: string;

  @IsOptional()
  @IsString()
  contactPhone?: string;

  @IsOptional()
  @IsString()
  businessLicense?: string;

  @IsOptional()
  @IsString()
  businessLicenseUrl?: string;

  @IsOptional()
  @IsArray()
  qualificationUrls?: string[];

  @IsString()
  district: string;

  @IsString()
  address: string;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  latitude?: number;

  @IsOptional()
  businessHours?: any;

  @IsOptional()
  @IsArray()
  serviceTypes?: number[];
}
