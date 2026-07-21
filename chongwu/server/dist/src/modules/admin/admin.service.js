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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = class AdminService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboard() {
        const [userCount, merchantCount, serviceOrderCount, idleOrderCount, petCount,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.merchant.count(),
            this.prisma.serviceOrder.count(),
            this.prisma.idleOrder.count(),
            this.prisma.pet.count(),
        ]);
        return { userCount, merchantCount, serviceOrderCount, idleOrderCount, petCount };
    }
    async getMerchants(query) {
        const { status, page = 1, pageSize = 20 } = query;
        const where = {};
        if (status !== undefined)
            where.status = Number(status);
        const [list, total] = await Promise.all([
            this.prisma.merchant.findMany({
                where,
                include: { user: { select: { nickname: true, phone: true } } },
                skip: (Number(page) - 1) * Number(pageSize),
                take: Number(pageSize),
            }),
            this.prisma.merchant.count({ where }),
        ]);
        return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total } };
    }
    async auditMerchant(id, dto) {
        return this.prisma.merchant.update({
            where: { id },
            data: {
                status: dto.status,
                rejectReason: dto.rejectReason,
            },
        });
    }
    async getOrders(query) {
        const { status, page = 1, pageSize = 20 } = query;
        const where = {};
        if (status !== undefined)
            where.status = Number(status);
        const [list, total] = await Promise.all([
            this.prisma.serviceOrder.findMany({
                where,
                skip: (Number(page) - 1) * Number(pageSize),
                take: Number(pageSize),
            }),
            this.prisma.serviceOrder.count({ where }),
        ]);
        return { list, pagination: { page: Number(page), pageSize: Number(pageSize), total } };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map