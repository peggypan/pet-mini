import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [
      userCount, merchantCount,
      serviceOrderCount, idleOrderCount, petCount,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.merchant.count(),
      this.prisma.serviceOrder.count(),
      this.prisma.idleOrder.count(),
      this.prisma.pet.count(),
    ]);

    return { userCount, merchantCount, serviceOrderCount, idleOrderCount, petCount };
  }

  async getMerchants(query: any) {
    const { status, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (status !== undefined) where.status = Number(status);

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

  async auditMerchant(id: number, dto: any) {
    return this.prisma.merchant.update({
      where: { id },
      data: {
        status: dto.status,
        rejectReason: dto.rejectReason,
      },
    });
  }

  async getOrders(query: any) {
    const { status, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (status !== undefined) where.status = Number(status);

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
}
