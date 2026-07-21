import { Controller, Get, Post, Body, UseGuards, Req, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';

@Controller('users')
export class UserController {
  constructor(private userService: UserService) {}

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Req() req) {
    return this.userService.getProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(AuthGuard('jwt'))
  async updateProfile(@Body() dto: UpdateUserDto, @Req() req) {
    return this.userService.updateProfile(req.user.userId, dto);
  }

  @Post('addresses')
  @UseGuards(AuthGuard('jwt'))
  async createAddress(@Body() dto: CreateAddressDto, @Req() req) {
    return this.userService.createAddress(req.user.userId, dto);
  }

  @Get('addresses')
  @UseGuards(AuthGuard('jwt'))
  async getAddresses(@Req() req) {
    return this.userService.getAddresses(req.user.userId);
  }
}
