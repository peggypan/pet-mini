"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PaymentService = class PaymentService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async unifiedOrder(userId, dto) {
        let order;
        if (dto.orderType === 1) {
            order = await this.prisma.serviceOrder.findFirst({
                where: { orderNo: dto.orderNo, userId },
            });
        }
        else if (dto.orderType === 3) {
            order = await this.prisma.idleOrder.findFirst({
                where: { orderNo: dto.orderNo, buyerId: userId },
            });
        }
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 0)
            throw new common_1.NotFoundException('订单状态不可支付');
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
    async handleNotify(body) {
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
                }
                else if (transaction.orderType === 3) {
                    await this.prisma.idleOrder.updateMany({
                        where: { orderNo },
                        data: { status: 1, paidAt: new Date() },
                    });
                }
            }
        }
        return { code: 'SUCCESS', message: 'OK' };
    }
    async refund(userId, dto) {
        const { orderNo, orderType } = dto;
        let order;
        if (orderType === 1) {
            order = await this.prisma.serviceOrder.findFirst({ where: { orderNo, userId } });
        }
        else if (orderType === 3) {
            order = await this.prisma.idleOrder.findFirst({ where: { orderNo, buyerId: userId } });
        }
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
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
        }
        else if (orderType === 3) {
            await this.prisma.idleOrder.update({
                where: { id: order.id },
                data: { status: 6, refundAt: new Date() },
            });
        }
        return { refundNo, amount: order.payAmount };
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map