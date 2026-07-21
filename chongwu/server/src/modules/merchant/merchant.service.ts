import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MerchantService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: any) {
    const { type, district, page = 1, pageSize = 20 } = query;
    const where: any = { status: 1 };
    if (type) where.type = Number(type);
    if (district) where.district = district;

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

  async findOne(id: number) {
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
    if (!merchant) throw new NotFoundException('商家不存在');
    return merchant;
  }

  async create(userId: number, dto: any) {
    const existing = await this.prisma.merchant.findFirst({
      where: { userId },
    });
    if (existing) throw new ConflictException('您已经申请过商家入驻');

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

  async getMyStore(userId: number) {
    return this.prisma.merchant.findFirst({
      where: { userId },
      include: { services: true },
    });
  }
}
