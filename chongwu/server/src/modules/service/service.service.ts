import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ServiceService {
  constructor(private prisma: PrismaService) {}

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

  async findAll(query: any) {
    const { categoryId, page = 1, pageSize = 20 } = query;
    const where: any = { status: 1 };
    if (categoryId) where.categoryId = Number(categoryId);

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

  async findOne(id: number) {
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
    if (!service) throw new NotFoundException('服务不存在');
    return service;
  }

  async createOrder(userId: number, dto: any) {
    const service = await this.prisma.service.findUnique({
      where: { id: Number(dto.serviceId) },
      include: { merchant: true },
    });
    if (!service) throw new NotFoundException('服务不存在');

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

  async getMyOrders(userId: number) {
    return this.prisma.serviceOrder.findMany({
      where: { userId },
      include: {
        service: { select: { name: true } },
        merchant: { select: { name: true, logoUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelOrder(userId: number, orderId: number) {
    const order = await this.prisma.serviceOrder.findFirst({
      where: { id: orderId, userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 0) throw new ForbiddenException('订单状态不可取消');

    await this.prisma.serviceOrder.update({
      where: { id: orderId },
      data: { status: 5, cancelledAt: new Date() },
    });

    return { success: true };
  }
}
