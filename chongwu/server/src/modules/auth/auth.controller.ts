import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { WxLoginDto } from './dto/wx-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('wx-login')
  async wxLogin(@Body() dto: WxLoginDto) {
    return this.authService.wxLogin(dto.code);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    return this.authService.getProfile(req.user.userId);
  }
}
