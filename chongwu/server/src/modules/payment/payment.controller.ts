import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private paymentService: PaymentService) {}

  @Post('unified-order')
  @UseGuards(AuthGuard('jwt'))
  async unifiedOrder(@Body() dto: CreatePaymentDto, @Req() req) {
    return this.paymentService.unifiedOrder(req.user.userId, dto);
  }

  @Post('notify')
  async notify(@Body() body: any) {
    return this.paymentService.handleNotify(body);
  }

  @Post('refund')
  @UseGuards(AuthGuard('jwt'))
  async refund(@Body() dto: any, @Req() req) {
    return this.paymentService.refund(req.user.userId, dto);
  }
}
