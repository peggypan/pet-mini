import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';
import { WxPhoneLoginDto } from './dto/wx-phone-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wx-login')
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto.code);
  }

  @Post('wx-phone-login')
  async wxPhoneLogin(@Body() dto: WxPhoneLoginDto) {
    return this.authService.wxPhoneLogin(dto);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
