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
exports.HealthController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const health_service_1 = require("./health.service");
const create_pet_dto_1 = require("./dto/create-pet.dto");
const create_health_record_dto_1 = require("./dto/create-health-record.dto");
let HealthController = class HealthController {
    constructor(healthService) {
        this.healthService = healthService;
    }
    async createPet(dto, req) {
        return this.healthService.createPet(req.user.userId, dto);
    }
    async getMyPets(req) {
        return this.healthService.getMyPets(req.user.userId);
    }
    async getPetDetail(id) {
        return this.healthService.getPetDetail(Number(id));
    }
    async createRecord(dto, req) {
        return this.healthService.createRecord(req.user.userId, dto);
    }
    async getPetRecords(petId) {
        return this.healthService.getPetRecords(Number(petId));
    }
    async getReminders(req) {
        return this.healthService.getReminders(req.user.userId);
    }
};
exports.HealthController = HealthController;
__decorate([
    (0, common_1.Post)('pets'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_pet_dto_1.CreatePetDto, Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "createPet", null);
__decorate([
    (0, common_1.Get)('pets'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getMyPets", null);
__decorate([
    (0, common_1.Get)('pets/:id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getPetDetail", null);
__decorate([
    (0, common_1.Post)('records'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_health_record_dto_1.CreateHealthRecordDto, Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "createRecord", null);
__decorate([
    (0, common_1.Get)('records/:petId'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getPetRecords", null);
__decorate([
    (0, common_1.Get)('reminders'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "getReminders", null);
exports.HealthController = HealthController = __decorate([
    (0, common_1.Controller)('health'),
    __metadata("design:paramtypes", [health_service_1.HealthService])
], HealthController);
//# sourceMappingURL=health.controller.js.map