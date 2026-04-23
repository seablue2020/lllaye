import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { RedisService } from '../../common/redis/redis.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as dayjs from 'dayjs';

export interface LoginDto {
  username: string;
  password: string;
}

export interface RegisterDto {
  username: string;
  password: string;
  realName: string;
  phone?: string;
  roleId?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private encryption: EncryptionService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: { role: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const isPasswordValid = await this.encryption.comparePassword(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = {
      sub: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role.code,
      roleName: user.role.name,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = uuidv4();

    await this.redis.set(`refresh:${user.id}`, refreshToken, 30 * 24 * 60 * 60);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.createLoginNotifications(user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        role: user.role.name,
        roleCode: user.role.code,
        orgId: user.orgId,
      },
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '7d',
    };
  }

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { username: dto.username } });
    if (existing) throw new ConflictException('用户名已存在');

    const hashedPassword = await this.encryption.hashPassword(dto.password);
    const defaultRole = await this.prisma.role.findFirst({ where: { code: 'prosecutor' } });

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        realName: dto.realName,
        phone: dto.phone,
        roleId: dto.roleId || defaultRole?.id || '',
      },
      include: { role: true },
    });

    return { id: user.id, username: user.username, realName: user.realName, role: user.role.name };
  }

  async refreshToken(userId: string, refreshToken: string) {
    const storedToken = await this.redis.get(`refresh:${userId}`);
    if (storedToken !== refreshToken) throw new UnauthorizedException('Refresh token 无效');

    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!user || user.status !== 'active') throw new UnauthorizedException('用户状态异常');

    const payload = {
      sub: user.id,
      username: user.username,
      realName: user.realName,
      role: user.role.code,
      roleName: user.role.name,
    };

    const newAccessToken = this.jwtService.sign(payload);
    const newRefreshToken = uuidv4();
    await this.redis.set(`refresh:${userId}`, newRefreshToken, 30 * 24 * 60 * 60);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: this.configService.get<string>('jwt.expiresIn') || '7d',
    };
  }

  async logout(userId: string) {
    await this.redis.del(`refresh:${userId}`);
    return { message: '退出登录成功' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, org: true },
    });
    if (!user) throw new UnauthorizedException('用户不存在');

    return {
      id: user.id,
      username: user.username,
      realName: user.realName,
      phone: user.phone ? this.encryption.maskPhone(user.phone) : null,
      email: user.email,
      role: user.role.name,
      roleCode: user.role.code,
      org: user.org ? { id: user.org.id, name: user.org.name } : null,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private async createLoginNotifications(userId: string) {
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();
    const pendingTasks = await this.prisma.task.count({
      where: { assigneeId: userId, status: 'pending', createdAt: { gte: today, lt: tomorrow } },
    });
    if (pendingTasks > 0) {
      await this.prisma.notification.create({
        data: {
          userId,
          type: 'reminder',
          title: '待办任务提醒',
          content: `您今日有 ${pendingTasks} 条待处理任务，请及时处理。`,
          priority: pendingTasks > 5 ? 'high' : 'normal',
        },
      });
    }
  }
}
