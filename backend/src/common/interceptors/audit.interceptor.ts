import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../prisma/prisma.service';
import { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, ip } = request;
    const user = (request as any).user;

    return next.handle().pipe(
      tap({
        next: async () => {
          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user?.id || 'anonymous',
                action: method,
                module: this.extractModule(url),
                bizId: this.extractBizId(url),
                detail: JSON.stringify({ url, body: this.sanitizeBody(body) }),
                ip: ip || '',
              },
            });
          } catch (e) {
            this.logger.warn(`Audit log failed: ${(e as Error).message}`);
          }
        },
        error: async (err: Error) => {
          try {
            await this.prisma.auditLog.create({
              data: {
                userId: user?.id || 'anonymous',
                action: `${method} [ERROR]`,
                module: this.extractModule(url),
                bizId: this.extractBizId(url),
                detail: err.message,
                ip: ip || '',
              },
            });
          } catch (e) {
            this.logger.warn(`Audit log failed: ${(e as Error).message}`);
          }
        },
      }),
    );
  }

  private extractModule(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[1] || 'unknown';
  }

  private extractBizId(url: string): string {
    const parts = url.split('/').filter(Boolean);
    return parts[2] || '';
  }

  private sanitizeBody(body: unknown): unknown {
    if (!body) return undefined;
    const sanitized = { ...(body as object) };
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
    for (const field of sensitiveFields) {
      if ((sanitized as Record<string, unknown>)[field]) {
        (sanitized as Record<string, unknown>)[field] = '***';
      }
    }
    return sanitized;
  }
}
