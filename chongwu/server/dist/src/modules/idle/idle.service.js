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
exports.IdleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let IdleService = class IdleService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCategories() {
        return [
            { id: 1, name: '食品' }, { id: 2, name: '日用品' },
            { id: 3, name: '笼具' }, { id: 4, name: '服饰' },
            { id: 5, name: '玩具' }, { id: 6, name: '保健护理' },
            { id: 7, name: '其他' },
        ];
    }
    async findAll(query) {
        const { categoryId, district, page = 1, pageSize = 20 } = query;
        const where = { status: 1 };
        if (categoryId)
            where.categoryId = Number(categoryId);
        if (district)
            where.district = district;
        const [list, total] = await Promise.all([
            this.prisma.idleItem.findMany({
                where,
                include: { user: { select: { id: true, nickname: true, avatarUrl: true } } },
                orderBy: { createdAt: 'desc' },
                skip: (Number(page) - 1) * Number(pageSize),
                take: Number(pageSize),
            }),
            this.prisma.idleItem.count({ where }),
        ]);
        return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total, totalPages: Math.ceil(total / Number(pageSize)) } };
    }
    async findOne(id) {
        const item = await this.prisma.idleItem.findUnique({
            where: { id },
            include: { user: { select: { id: true, nickname: true, avatarUrl: true, city: true, district: true } } },
        });
        if (!item)
            throw new common_1.NotFoundException('物品不存在');
        return item;
    }
    async create(userId, dto) {
        return this.prisma.idleItem.create({
            data: {
                userId, categoryId: dto.categoryId, title: dto.title,
                description: dto.description, images: dto.images ? JSON.stringify(dto.images) : '',
                price: dto.price, originalPrice: dto.originalPrice,
                conditionLevel: dto.conditionLevel, usageDesc: dto.usageDesc,
                tradeType: dto.tradeType, location: dto.location,
                district: dto.district, longitude: dto.longitude,
                latitude: dto.latitude, status: 0,
            },
        });
    }
    async createOrder(userId, dto) {
        const item = await this.prisma.idleItem.findUnique({
            where: { id: Number(dto.idleItemId), status: 1 },
        });
        if (!item)
            throw new common_1.NotFoundException('物品不存在或已下架');
        if (item.userId === userId)
            throw new common_1.ForbiddenException('不能购买自己的物品');
        const orderNo = `IO${Date.now()}${Math.floor(Math.random() * 1000)}`;
        const platformFee = item.price * 0.05;
        const sellerAmount = item.price - platformFee;
        const order = await this.prisma.idleOrder.create({
            data: {
                orderNo, buyerId: userId, sellerId: item.userId,
                idleItemId: item.id, itemTitle: item.title,
                itemPrice: item.price, totalAmount: item.price,
                platformFee, payAmount: item.price, sellerAmount,
                deliveryType: dto.deliveryType, address: dto.address, status: 0,
            },
        });
        return { orderNo: order.orderNo, payAmount: order.payAmount };
    }
    async getMyOrders(userId) {
        const [buyOrders, sellOrders] = await Promise.all([
            this.prisma.idleOrder.findMany({
                where: { buyerId: userId },
                include: { idleItem: { select: { title: true, images: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.idleOrder.findMany({
                where: { sellerId: userId },
                include: { idleItem: { select: { title: true, images: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        return { buyOrders, sellOrders };
    }
    async payOrder(userId, orderId) {
        const order = await this.prisma.idleOrder.findFirst({
            where: { id: orderId, buyerId: userId },
        });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 0)
            throw new common_1.ForbiddenException('订单状态不可支付');
        await this.prisma.$transaction([
            this.prisma.idleOrder.update({
                where: { id: orderId },
                data: { status: 1, paidAt: new Date() },
            }),
            this.prisma.idleItem.update({
                where: { id: order.idleItemId },
                data: { status: 2 },
            }),
        ]);
        return { success: true };
    }
    async confirmReceive(userId, orderId) {
        const order = await this.prisma.idleOrder.findFirst({
            where: { id: orderId, buyerId: userId },
        });
        if (!order)
            throw new common_1.NotFoundException('订单不存在');
        if (order.status !== 2)
            throw new common_1.ForbiddenException('订单状态不可确认收货');
        await this.prisma.idleOrder.update({
            where: { id: orderId },
            data: { status: 4, completedAt: new Date() },
        });
        return { success: true };
    }
};
exports.IdleService = IdleService;
exports.IdleService = IdleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], IdleService);
//# sourceMappingURL=idle.service.js.map