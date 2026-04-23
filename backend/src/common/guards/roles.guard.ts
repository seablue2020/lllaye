import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { META_ROLES } from '../decorators/roles.decorator';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(META_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('用户未认证');
    }

    const userRecord = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { role: true },
    });

    if (!userRecord) {
      throw new ForbiddenException('用户不存在');
    }

    const hasRole = requiredRoles.includes(userRecord.role.name);
    if (!hasRole) {
      throw new ForbiddenException(`需要角色权限: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
