import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  async createPet(userId: number, dto: any) {
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

  async getMyPets(userId: number) {
    return this.prisma.pet.findMany({
      where: { userId, status: 1 },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPetDetail(id: number) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        healthRecords: { orderBy: { doneAt: 'desc' } },
      },
    });
    if (!pet) throw new NotFoundException('宠物不存在');
    return pet;
  }

  async createRecord(userId: number, dto: any) {
    const pet = await this.prisma.pet.findFirst({
      where: { id: Number(dto.petId), userId },
    });
    if (!pet) throw new NotFoundException('宠物不存在');

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

  async getPetRecords(petId: number) {
    return this.prisma.healthRecord.findMany({
      where: { petId },
      orderBy: { doneAt: 'desc' },
    });
  }

  async getReminders(userId: number) {
    return this.prisma.healthRecord.findMany({
      where: { userId, validUntil: { not: null }, reminded: false },
      include: { pet: { select: { name: true, id: true } } },
      orderBy: { validUntil: 'asc' },
    });
  }
}
