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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IdleController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const idle_service_1 = require("./idle.service");
const create_idle_item_dto_1 = require("./dto/create-idle-item.dto");
const create_idle_order_dto_1 = require("./dto/create-idle-order.dto");
const query_idle_dto_1 = require("./dto/query-idle.dto");
let IdleController = class IdleController {
    constructor(idleService) {
        this.idleService = idleService;
    }
    async getCategories() {
        return this.idleService.getCategories();
    }
    async findAll(query) {
        return this.idleService.findAll(query);
    }
    async findOne(id) {
        return this.idleService.findOne(Number(id));
    }
    async create(dto, req) {
        return this.idleService.create(req.user.userId, dto);
    }
    async createOrder(dto, req) {
        return this.idleService.createOrder(req.user.userId, dto);
    }
    async getMyOrders(req) {
        return this.idleService.getMyOrders(req.user.userId);
    }
    async payOrder(id, req) {
        return this.idleService.payOrder(req.user.userId, Number(id));
    }
    async confirmReceive(id, req) {
        return this.idleService.confirmReceive(req.user.userId, Number(id));
    }
};
exports.IdleController = IdleController;
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [query_idle_dto_1.QueryIdleDto]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_idle_item_dto_1.CreateIdleItemDto, Object]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('orders'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_idle_order_dto_1.CreateIdleOrderDto, Object]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "createOrder", null);
__decorate([
    (0, common_1.Get)('orders/my'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "getMyOrders", null);
__decorate([
    (0, common_1.Put)('orders/:id/pay'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "payOrder", null);
__decorate([
    (0, common_1.Put)('orders/:id/confirm'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IdleController.prototype, "confirmReceive", null);
exports.IdleController = IdleController = __decorate([
    (0, common_1.Controller)('idle'),
    __metadata("design:paramtypes", [idle_service_1.IdleService])
], IdleController);
//# sourceMappingURL=idle.controller.js.map