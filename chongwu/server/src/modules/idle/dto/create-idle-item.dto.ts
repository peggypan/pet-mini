import { IsString, IsNumber, IsOptional, IsArray, IsNotEmpty } from 'class-validator';

export class CreateIdleItemDto {
  @IsNumber()
  categoryId: number;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  images?: string[];

  @IsNumber()
  price: number;

  @IsOptional()
  originalPrice?: number;

  @IsNumber()
  conditionLevel: number;

  @IsOptional()
  @IsString()
  usageDesc?: string;

  @IsNumber()
  tradeType: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  longitude?: number;

  @IsOptional()
  latitude?: number;
}

export class CreateIdleOrderDto {
  @IsNumber()
  idleItemId: number;

  @IsNumber()
  deliveryType: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class QueryIdleDto {
  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsNumber()
  conditionLevel?: number;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  pageSize?: number;
}
