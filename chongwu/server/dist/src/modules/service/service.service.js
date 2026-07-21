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
exports.ServiceService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ServiceService = class ServiceService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCategories() {
        return [
            { id: 1, name: '上门洗护' },
            { id: 2, name: '上门喂宠' },
            { id: 3, name: '寄养' },
            { id: 4, name: '遛狗' },
            { id: 5, name: '宠物医院' },
            { id: 6, name: '宠物店' },
        ];
    }
    async findAll(query) {
        const { categoryId, page = 1, pageSize = 20 } = query;
        const where = { status: 1 };
        if (categoryId)
            where.categoryId = Number(categoryId);
        const [list, total] = await Promise.all([
            this.prisma.service.findMany({
                where,
                include: {
                    merchant: {
                        select: {
                            id: true, name: true, logoUrl: true,
                            rating: true, district: true, address: true,
                        },
                    },
                },
                orderBy: { sortOrder: 'desc' },
                skip: (Number(page) - 1) * Number(pageSize),
                take: Number(pageSize),
            }),
            this.prisma.service.count({ where }),
        ]);
        return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total, totalPages: Math.ceil(total / Number(pageSize)) } };
    }
    async findOne(id) {
        const service = await this.prisma.service.findUnique({
            where: { id },
            include: {
                merchant: {
                    select: {
                        id: true, name: true, logoUrl: true,
                        rating: true, reviewCount: true,
                        district: true, address: true, businessHours: true,
                    },
                },
            },
        });
        if (!service)
            throw new common_1.NotFoundException('服务不存在');
        return service;
    }
    async createOrder(userId, dto) {
        const service = await this.prisma.service.findUnique({
            where: { id: Number(dto.serviceId) },
            include: { merchant: true },
        });
        if (!service)
            throw new common_1.NotFoundException('服务不存在');
        const orderNo = `SO${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const totalAmount = service.price * (dto.quantity || 1);
        const platformFee = totalAmount * service.merchant.commissionRate;
        const payAmount = totalAmount;
        const merchantAmount = totalAmount - platformFee;
        const order = await this.prisma.serviceOrder.create({
            data: {
                orderNo, userId, merchantId: service.merchantId, serviceId: service.id,
                serviceName: service.name, servicePrice: service.price,
                quantity: dto.quantity || 1, totalAmount, payAmount, platformFee, merchantAmount,
                petId: dto.petId ? Number(dto.petId) : null,
                contactName: dto.contactName, contactPhone: dto.contactPhone,
                address: dto.address, appointmentDate: dto.appointmentDate,
                appointmentTime: dto.appointmentTime, remark: dto.remark, status: 0,
            },
        });
        return { orderNo: order.orderNo, payAmount: order.payAmount };
    }
    async getMyOrders(userId) {
        return this.prisma.serviceOrder.findMany({
            where: { userId },
            include: {
                service: { select: { name: true } },
                merchant: { select: { name: true, logoUrl: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async cancelOrder(userId, orderId) {
        const order = await this.prisma.serviceOrder.findFirst({
            where: { id: orderId, userId },
        });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 0)
            throw new common_1.ForbiddenException('订单状态不可取消');
        await this.prisma.serviceOrder.update({
            where: { id: orderId },
            data: { status: 5, cancelledAt: new Date() },
        });
        return { success: true };
    }
};
exports.ServiceService = ServiceService;
exports.ServiceService = ServiceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ServiceService);
//# sourceMappingURL=service.service.js.map