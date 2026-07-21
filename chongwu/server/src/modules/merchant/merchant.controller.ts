import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MerchantService } from './merchant.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';

@Controller('merchants')
export class MerchantController {
  constructor(private merchantService: MerchantService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.merchantService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.merchantService.findOne(Number(id));
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() dto: CreateMerchantDto, @Req() req) {
    return this.merchantService.create(req.user.userId, dto);
  }

  @Get('my/store')
  @UseGuards(AuthGuard('jwt'))
  async getMyStore(@Req() req) {
    return this.merchantService.getMyStore(req.user.userId);
  }
}
