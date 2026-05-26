import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { IdleService } from './idle.service';
import { CreateIdleItemDto } from './dto/create-idle-item.dto';
import { CreateIdleOrderDto } from './dto/create-idle-order.dto';
import { QueryIdleDto } from './dto/query-idle.dto';

@Controller('idle')
export class IdleController {
  constructor(private idleService: IdleService) {}

  @Get('categories')
  async getCategories() {
    return this.idleService.getCategories();
  }

  @Get()
  async findAll(@Query() query: QueryIdleDto) {
    return this.idleService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.idleService.findOne(Number(id));
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  async create(@Body() dto: CreateIdleItemDto, @Req() req) {
    return this.idleService.create(req.user.userId, dto);
  }

  @Post('orders')
  @UseGuards(AuthGuard('jwt'))
  async createOrder(@Body() dto: CreateIdleOrderDto, @Req() req) {
    return this.idleService.createOrder(req.user.userId, dto);
  }

  @Get('orders/my')
  @UseGuards(AuthGuard('jwt'))
  async getMyOrders(@Req() req) {
    return this.idleService.getMyOrders(req.user.userId);
  }

  @Put('orders/:id/pay')
  @UseGuards(AuthGuard('jwt'))
  async payOrder(@Param('id') id: string, @Req() req) {
    return this.idleService.payOrder(req.user.userId, Number(id));
  }

  @Put('orders/:id/confirm')
  @UseGuards(AuthGuard('jwt'))
  async confirmReceive(@Param('id') id: string, @Req() req) {
    return this.idleService.confirmReceive(req.user.userId, Number(id));
  }
}
