import { IsString, IsNumber, IsNotEmpty } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  orderNo: string;

  @IsNumber()
  orderType: number;
}
