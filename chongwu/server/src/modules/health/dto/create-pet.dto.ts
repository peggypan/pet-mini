import { IsString, IsNumber, IsOptional, IsBoolean, IsArray, IsNotEmpty } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  species: number;

  @IsOptional()
  @IsString()
  breedName?: string;

  @IsOptional()
  @IsNumber()
  gender?: number;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  weight?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsBoolean()
  isSterilized?: boolean;

  @IsOptional()
  @IsString()
  microchip?: string;

  @IsOptional()
  @IsString()
  remark?: string;
}

export class CreateHealthRecordDto {
  @IsNumber()
  petId: number;

  @IsNumber()
  recordType: number;

  @IsString()
  @IsNotEmpty()
  itemName: string;

  @IsOptional()
  @IsString()
  itemBrand?: string;

  @IsOptional()
  @IsString()
  itemBatch?: string;

  @IsString()
  doneAt: string;

  @IsOptional()
  @IsString()
  validUntil?: string;

  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  doctorName?: string;

  @IsOptional()
  cost?: number;

  @IsOptional()
  @IsArray()
  photos?: string[];

  @IsOptional()
  @IsString()
  remark?: string;

  @IsOptional()
  @IsNumber()
  remindBefore?: number;
}
