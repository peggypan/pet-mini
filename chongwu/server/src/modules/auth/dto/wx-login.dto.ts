import { IsString, IsNotEmpty } from 'class-validator';

export class WxLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;
}
