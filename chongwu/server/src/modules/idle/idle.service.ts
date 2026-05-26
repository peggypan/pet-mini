import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class IdleService {
  constructor(private prisma: PrismaService) {}

  async getCategories() {
    return [
      { id: 1, name: '食品' }, { id: 2, name: '日用品' },
      { id: 3, name: '笼具' }, { id: 4, name: '服饰' },
      { id: 5, name: '玩具' }, { id: 6, name: '保健护理' },
      { id: 7, name: '其他' },
    ];
  }

  async findAll(query: any) {
    const { categoryId, district, page = 1, pageSize = 20 } = query;
    const where: any = { status: 1 };
    if (categoryId) where.categoryId = Number(categoryId);
    if (district) where.district = district;

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

  async findOne(id: number) {
    const item = await this.prisma.idleItem.findUnique({
      where: { id },
      include: { user: { select: { id: true, nickname: true, avatarUrl: true, city: true, district: true } } },
    });
    if (!item) throw new NotFoundException('物品不存在');
    return item;
  }

  async create(userId: number, dto: any) {
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

  async createOrder(userId: number, dto: any) {
    const item = await this.prisma.idleItem.findUnique({
      where: { id: Number(dto.idleItemId), status: 1 },
    });
    if (!item) throw new NotFoundException('物品不存在或已下架');
    if (item.userId === userId) throw new ForbiddenException('不能购买自己的物品');

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

  async getMyOrders(userId: number) {
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

  async payOrder(userId: number, orderId: number) {
    const order = await this.prisma.idleOrder.findFirst({
      where: { id: orderId, buyerId: userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 0) throw new ForbiddenException('订单状态不可支付');

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

  async confirmReceive(userId: number, orderId: number) {
    const order = await this.prisma.idleOrder.findFirst({
      where: { id: orderId, buyerId: userId },
    });
    if (!order) throw new NotFoundException('订单不存在');
    if (order.status !== 2) throw new ForbiddenException('订单状态不可确认收货');

    await this.prisma.idleOrder.update({
      where: { id: orderId },
      data: { status: 4, completedAt: new Date() },
    });

    return { success: true };
  }
}
