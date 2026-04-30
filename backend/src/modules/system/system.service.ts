import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SystemService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  async getUsers(query: { page?: number | string; pageSize?: number | string; keyword?: string; roleId?: string }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.UserWhereInput = { status: { not: 'deleted' } };
    if (query.keyword) {
      where.OR = [
        { username: { contains: query.keyword, mode: 'insensitive' } },
        { realName: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }
    if (query.roleId) where.roleId = query.roleId;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, realName: true, phone: true, email: true, status: true, lastLoginAt: true, role: { select: { id: true, name: true, code: true } }, org: { select: { id: true, name: true } }, createdAt: true },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { list: users, total, page, pageSize };
  }

  async createUser(dto: any) {
    const hashed = await this.encryption.hashPassword(dto.password || '123456');
    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashed,
        realName: dto.realName,
        phone: dto.phone,
        email: dto.email,
        roleId: dto.roleId,
        orgId: dto.orgId,
      },
      select: { id: true, username: true, realName: true, role: true },
    });
    return user;
  }

  async updateUser(id: string, dto: any) {
    const data: any = {};
    if (dto.realName) data.realName = dto.realName;
    if (dto.phone) data.phone = dto.phone;
    if (dto.email) data.email = dto.email;
    if (dto.status) data.status = dto.status;
    if (dto.roleId) data.role = { connect: { id: dto.roleId } };
    if (dto.orgId) data.org = { connect: { id: dto.orgId } };
    if (dto.password) data.password = await this.encryption.hashPassword(dto.password);

    return this.prisma.user.update({ where: { id }, data, select: { id: true, username: true, realName: true } });
  }

  async deleteUser(id: string) {
    await this.prisma.user.update({ where: { id }, data: { status: 'deleted' } });
    return { message: '用户已删除' };
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, code: true, description: true, permissions: true, status: true, createdAt: true, _count: { select: { users: true } } },
    });
  }

  async createRole(dto: any) {
    return this.prisma.role.create({ data: { name: dto.name, code: dto.code, description: dto.description, permissions: dto.permissions || [] } });
  }

  async updateRole(id: string, dto: any) {
    return this.prisma.role.update({ where: { id }, data: { name: dto.name, description: dto.description, permissions: dto.permissions, status: dto.status } });
  }

  async getOrgs() {
    const orgs = await this.prisma.org.findMany({ where: { status: 'active' }, orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] });
    const rootOrgs = orgs.filter((o) => !o.parentId);
    const buildTree = (parentId: string | null) => orgs.filter((o) => o.parentId === parentId).map((o) => ({ ...o, children: buildTree(o.id) }));
    return rootOrgs.map((o) => ({ ...o, children: buildTree(o.id) }));
  }

  async getDictionaries(type?: string) {
    const where: Prisma.DictionaryWhereInput = { status: 'active' };
    if (type) where.type = type;
    return this.prisma.dictionary.findMany({ where, orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }] });
  }

  async createDictionary(dto: any) {
    return this.prisma.dictionary.create({ data: dto });
  }

  async updateDictionary(id: string, dto: any) {
    return this.prisma.dictionary.update({ where: { id }, data: dto });
  }

  async getAuditLogs(query: { page?: number | string; pageSize?: number | string; userId?: string; module?: string; startDate?: string; endDate?: string }) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.module) where.module = query.module;
    if (query.startDate) where.timestamp = { gte: new Date(query.startDate) };
    if (query.endDate) where.timestamp = { ...(where.timestamp as any || {}), lte: new Date(query.endDate) };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({ where, skip, take: pageSize, orderBy: { timestamp: 'desc' }, select: { id: true, userId: true, action: true, module: true, bizId: true, detail: true, ip: true, timestamp: true } }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { list: logs, total, page, pageSize };
  }

  async getSystemConfig() {
    const configs = await this.prisma.dictionary.findMany({ where: { type: 'system_config' } });
    return configs.reduce((acc: any, c) => { acc[c.code] = c.value; return acc; }, {});
  }
}
