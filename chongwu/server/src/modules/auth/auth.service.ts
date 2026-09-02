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
        phone: user.phone,
      },
    };
  }

  /**
   * 手机号授权登录。
   * 正式环境需用 phoneCode + 微信 access_token 调用 getuserphonenumber。
   * 当前无 AppSecret 时：完成登录并标记手机号已授权（演示占位）。
   */
  async wxPhoneLogin(params: {
    code: string;
    phoneCode?: string;
    encryptedData?: string;
    iv?: string;
  }) {
    const result = await this.wxLogin(params.code);
    const hasPhoneAuth = !!(params.phoneCode || params.encryptedData);

    if (!hasPhoneAuth) {
      return result;
    }

    // 占位：真实项目在此用微信 API 换取 phone_info.phoneNumber
    const demoTail =
      (params.phoneCode || '0000').replace(/\W/g, '').slice(-4) || '0000';
    const phone = `138****${demoTail}`;

    const user = await this.prisma.user.update({
      where: { id: result.user.id },
      data: {
        phone,
        nickname: result.user.nickname || '宠友',
      },
    });

    return {
      token: result.token,
      user: {
        id: user.id,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        phoneMasked: user.phone,
        loginType: 'phone',
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
