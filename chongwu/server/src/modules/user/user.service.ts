import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        pets: { where: { status: 1 } },
      },
    });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  async updateProfile(userId: number, dto: any) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        nickname: dto.nickname,
        avatarUrl: dto.avatarUrl,
        phone: dto.phone,
        gender: dto.gender,
        city: dto.city,
        district: dto.district,
        address: dto.address,
      },
    });
  }

  async createAddress(userId: number, dto: any) {
    if (dto.isDefault) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { address: dto.detail },
      });
    }
    return { success: true };
  }

  async getAddresses(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { address: true },
    });
    return user?.address ? [{ detail: user.address }] : [];
  }
}
