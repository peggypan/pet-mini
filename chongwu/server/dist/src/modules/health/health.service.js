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
exports.HealthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let HealthService = class HealthService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPet(userId, dto) {
        return this.prisma.pet.create({
            data: {
                userId, name: dto.name, species: dto.species,
                breedName: dto.breedName, gender: dto.gender,
                birthday: dto.birthday, weight: dto.weight,
                color: dto.color, isSterilized: dto.isSterilized,
                microchip: dto.microchip, remark: dto.remark,
            },
        });
    }
    async getMyPets(userId) {
        return this.prisma.pet.findMany({
            where: { userId, status: 1 },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getPetDetail(id) {
        const pet = await this.prisma.pet.findUnique({
            where: { id },
            include: {
                healthRecords: { orderBy: { doneAt: 'desc' } },
            },
        });
        if (!pet)
            throw new common_1.NotFoundException('宠物不存在');
        return pet;
    }
    async createRecord(userId, dto) {
        const pet = await this.prisma.pet.findFirst({
            where: { id: Number(dto.petId), userId },
        });
        if (!pet)
            throw new common_1.NotFoundException('宠物不存在');
        return this.prisma.healthRecord.create({
            data: {
                petId: Number(dto.petId), userId,
                recordType: dto.recordType, itemName: dto.itemName,
                itemBrand: dto.itemBrand, itemBatch: dto.itemBatch,
                doneAt: dto.doneAt, validUntil: dto.validUntil,
                clinicName: dto.clinicName, doctorName: dto.doctorName,
                cost: dto.cost, photos: dto.photos ? JSON.stringify(dto.photos) : '',
                remark: dto.remark, remindBefore: dto.remindBefore || 7,
            },
        });
    }
    async getPetRecords(petId) {
        return this.prisma.healthRecord.findMany({
            where: { petId },
            orderBy: { doneAt: 'desc' },
        });
    }
    async getReminders(userId) {
        return this.prisma.healthRecord.findMany({
            where: { userId, validUntil: { not: null }, reminded: false },
            include: { pet: { select: { name: true, id: true } } },
            orderBy: { validUntil: 'asc' },
        });
    }
};
exports.HealthService = HealthService;
exports.HealthService = HealthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HealthService);
//# sourceMappingURL=health.service.js.map