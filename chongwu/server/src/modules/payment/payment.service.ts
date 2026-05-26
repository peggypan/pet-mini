import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async unifiedOrder(userId: number, dto: any) {
    let order: any;
    if (dto.orderType === 1) {
      order = await this.prisma.serviceOrder.findFirst({
        where: { orderNo: dto.orderNo, userId },
      });
    } else if (dto.orderType === 3) {
      order = await this.prisma.idleOrder.findFirst({
        where: { orderNo: dto.orderNo, buyerId: userId },
      });
    }
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 0) throw new NotFoundException('订单状态不可支付');

    const transactionNo = `TX${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await this.prisma.transaction.create({
      data: {
        transactionNo, userId, orderNo: dto.orderNo,
        orderType: dto.orderType, type: 1,
        amount: order.payAmount, status: 0,
      },
    });

    return { transactionNo, orderNo: dto.orderNo, payAmount: order.payAmount, prepayId: `mock_prepay_${Date.now()}` };
  }

  async handleNotify(body: any) {
    const { orderNo, resultCode } = body;
    if (resultCode === 'SUCCESS') {
      const transaction = await this.prisma.transaction.findFirst({ where: { orderNo } });
      if (transaction) {
        await this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 1 },
        });
        if (transaction.orderType === 1) {
          await this.prisma.serviceOrder.updateMany({
            where: { orderNo },
            data: { status: 1, paidAt: new Date() },
          });
        } else if (transaction.orderType === 3) {
          await this.prisma.idleOrder.updateMany({
            where: { orderNo },
            data: { status: 1, paidAt: new Date() },
          });
        }
      }
    }
    return { code: 'SUCCESS', message: 'OK' };
  }

  async refund(userId: number, dto: any) {
    const { orderNo, orderType } = dto;
    let order: any;
    if (orderType === 1) {
      order = await this.prisma.serviceOrder.findFirst({ where: { orderNo, userId } });
    } else if (orderType === 3) {
      order = await this.prisma.idleOrder.findFirst({ where: { orderNo, buyerId: userId } });
    }
    if (!order) throw new NotFoundException('订单不存在');

    const refundNo = `RF${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await this.prisma.transaction.create({
      data: {
        transactionNo: refundNo, userId, orderNo,
        orderType, type: 2,
        amount: order.payAmount, status: 1,
      },
    });

    if (orderType === 1) {
      await this.prisma.serviceOrder.update({
        where: { id: order.id },
        data: { status: 7, refundAmount: order.payAmount, refundAt: new Date() },
      });
    } else if (orderType === 3) {
      await this.prisma.idleOrder.update({
        where: { id: order.id },
        data: { status: 6, refundAt: new Date() },
      });
    }

    return { refundNo, amount: order.payAmount };
  }
}
