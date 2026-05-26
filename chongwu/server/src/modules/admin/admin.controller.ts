import { Controller, Get, Post, Body, Param, Put, Query } from '@nestjs/common';
import { AdminService } from './admin.service';

@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('merchants')
  async getMerchants(@Query() query: any) {
    return this.adminService.getMerchants(query);
  }

  @Put('merchants/:id/audit')
  async auditMerchant(@Param('id') id: string, @Body() dto: any) {
    return this.adminService.auditMerchant(Number(id), dto);
  }

  @Get('orders')
  async getOrders(@Query() query: any) {
    return this.adminService.getOrders(query);
  }
}
