import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async wxLogin(code: string) {
    const openid = `wx_${code}`;
    
    let user = await this.prisma.user.findUnique({
      where: { openid },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          openid,
          nickname: `用户${Date.now().toString().slice(-6)}`,
          status: 1,
        },
      });
    }

    const token = this.jwtService.sign({
      sub: user.id,
      openid: user.openid,
    });

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        pets: { where: { status: 1 } },
      },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    return user;
  }
}
