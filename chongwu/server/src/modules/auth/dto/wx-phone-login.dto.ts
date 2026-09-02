import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class WxPhoneLoginDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  /** 新版 getPhoneNumber 返回的动态令牌，服务端可换真实手机号 */
  @IsOptional()
  @IsString()
  phoneCode?: string;

  /** 旧版加密数据（兼容） */
  @IsOptional()
  @IsString()
  encryptedData?: string;

  @IsOptional()
  @IsString()
  iv?: string;
}
