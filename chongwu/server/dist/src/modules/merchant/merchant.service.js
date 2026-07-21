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
exports.MerchantService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let MerchantService = class MerchantService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { type, district, page = 1, pageSize = 20 } = query;
        const where = { status: 1 };
        if (type)
            where.type = Number(type);
        if (district)
            where.district = district;
        const [list, total] = await Promise.all([
            this.prisma.merchant.findMany({
                where,
                select: {
                    id: true, name: true, logoUrl: true,
                    type: true, rating: true, reviewCount: true,
                    orderCount: true, district: true, address: true,
                },
                orderBy: { createdAt: 'desc' },
                skip: (Number(page) - 1) * Number(pageSize),
                take: Number(pageSize),
            }),
            this.prisma.merchant.count({ where }),
        ]);
        return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total, totalPages: Math.ceil(total / Number(pageSize)) } };
    }
    async findOne(id) {
        const merchant = await this.prisma.merchant.findUnique({
            where: { id },
            include: {
                services: {
                    where: { status: 1 },
                    select: {
                        id: true, name: true,
                        price: true, originalPrice: true,
                        salesCount: true, rating: true,
                    },
                },
            },
        });
        if (!merchant)
            throw new common_1.NotFoundException('商家不存在');
        return merchant;
    }
    async create(userId, dto) {
        const existing = await this.prisma.merchant.findFirst({
            where: { userId },
        });
        if (existing)
            throw new common_1.ConflictException('您已经申请过商家入驻');
        return this.prisma.merchant.create({
            data: {
                userId, name: dto.name, type: dto.type,
                description: dto.description,
                district: dto.district, address: dto.address,
                longitude: dto.longitude, latitude: dto.latitude,
                businessHours: dto.businessHours,
                serviceTypes: dto.serviceTypes ? JSON.stringify(dto.serviceTypes) : '',
                status: 0,
            },
        });
    }
    async getMyStore(userId) {
        return this.prisma.merchant.findFirst({
            where: { userId },
            include: { services: true },
        });
    }
};
exports.MerchantService = MerchantService;
exports.MerchantService = MerchantService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MerchantService);
//# sourceMappingURL=merchant.service.js.map