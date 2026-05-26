import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { CreateServiceOrderDto } from './dto/create-service-order.dto';
import { QueryServiceDto } from './dto/query-service.dto';

@Controller('services')
export class ServiceController {
  constructor(private serviceService: ServiceService) {}

  @Get('categories')
  async getCategories() {
    return this.serviceService.getCategories();
  }

  @Get()
  async findAll(@Query() query: QueryServiceDto) {
    return this.serviceService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.serviceService.findOne(Number(id));
  }

  @Post('orders')
  @UseGuards(AuthGuard('jwt'))
  async createOrder(@Body() dto: CreateServiceOrderDto, @Req() req) {
    return this.serviceService.createOrder(req.user.userId, dto);
  }

  @Get('orders/my')
  @UseGuards(AuthGuard('jwt'))
  async getMyOrders(@Req() req) {
    return this.serviceService.getMyOrders(req.user.userId);
  }

  @Put('orders/:id/cancel')
  @UseGuards(AuthGuard('jwt'))
  async cancelOrder(@Param('id') id: string, @Req() req) {
    return this.serviceService.cancelOrder(req.user.userId, Number(id));
  }
}
