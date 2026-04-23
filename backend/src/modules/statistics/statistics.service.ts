import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class StatisticsService {
  constructor(private prisma: PrismaService) {}

  async getOverview(query: { startDate?: string; endDate?: string; orgId?: string }) {
    const where: Prisma.ClueWhereInput = {};
    if (query.startDate) where.createdAt = { ...where.createdAt as any, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt as any, lte: new Date(query.endDate) };

    const caseWhere: Prisma.CaseWhereInput = {};
    if (query.startDate) caseWhere.filedAt = { ...caseWhere.filedAt as any, gte: new Date(query.startDate) };
    if (query.endDate) caseWhere.filedAt = { ...caseWhere.filedAt as any, lte: new Date(query.endDate) };

    const [totalClues, newClues, pendingClues, processedClues, rejectedClues, totalCases, closedCases] =
      await Promise.all([
        this.prisma.clue.count({ where }),
        this.prisma.clue.count({ where: { ...where, status: 'closed' } }),
        this.prisma.clue.count({ where: { ...where, status: 'pending_review' } }),
        this.prisma.clue.count({ where: { ...where, status: { in: ['under_review', 'triaged'] } } }),
        this.prisma.clue.count({ where: { ...where, status: 'rejected' } }),
        this.prisma.case.count({ where: caseWhere }),
        this.prisma.case.count({ where: { ...caseWhere, status: 'closed' } }),
      ]);

    // 来源分布
    const sourceStats = await this.prisma.clue.groupBy({
      by: ['source'],
      where,
      _count: true,
    });

    // 诉求类型分布
    const claimTypeStats = await this.prisma.clue.groupBy({
      by: ['claimType'],
      where,
      _count: true,
    });

    // 金额统计
    const amountStats = await this.prisma.clue.aggregate({
      where,
      _sum: { amount: true },
      _avg: { amount: true },
    });

    return {
      summary: {
        totalClues,
        newClues,
        pendingClues,
        processedClues,
        rejectedClues,
        processingRate: totalClues > 0 ? Math.round(((processedClues + newClues) / totalClues) * 100) : 0,
      },
      caseSummary: {
        total: totalCases,
        closed: closedCases,
        closedRate: totalCases > 0 ? Math.round((closedCases / totalCases) * 100) : 0,
      },
      sourceDistribution: sourceStats.map((s) => ({
        source: s.source,
        label: this.getSourceLabel(s.source),
        count: s._count,
      })),
      claimTypeDistribution: claimTypeStats.map((s) => ({
        type: s.claimType,
        label: this.getClaimTypeLabel(s.claimType),
        count: s._count,
      })),
      amountSummary: {
        total: amountStats._sum.amount || 0,
        average: amountStats._avg.amount || 0,
      },
    };
  }

  async getRegionAnalysis(query: { startDate?: string; endDate?: string }) {
    const where: Prisma.ClueWhereInput = {};
    if (query.startDate) where.createdAt = { ...where.createdAt as any, gte: new Date(query.startDate) };
    if (query.endDate) where.createdAt = { ...where.createdAt as any, lte: new Date(query.endDate) };

    const clues = await this.prisma.clue.findMany({
      where,
      select: {
        projectAddressStd: true,
        amount: true,
        personCount: true,
        riskLevel: true,
        status: true,
      },
    });

    // 按区域聚合
    const regionMap = new Map<string, any>();

    for (const clue of clues) {
      const addr = clue.projectAddressStd as any;
      const region = addr?.district || '未知区域';

      if (!regionMap.has(region)) {
        regionMap.set(region, { region, count: 0, totalAmount: 0, totalPerson: 0, highRisk: 0 });
      }

      const r = regionMap.get(region)!;
      r.count++;
      r.totalAmount += Number(clue.amount || 0);
      r.totalPerson += clue.personCount;
      if (clue.riskLevel === 'high') r.highRisk++;
    }

    const regions = Array.from(regionMap.values()).sort((a, b) => b.count - a.count);

    return {
      regions,
      totalRegions: regions.length,
      topRegions: regions.slice(0, 10),
    };
  }

  async getQualityAnalysis(query: { startDate?: string; endDate?: string }) {
    const where: Prisma.CaseWhereInput = {};
    if (query.startDate) where.filedAt = { ...where.filedAt as any, gte: new Date(query.startDate) };
    if (query.endDate) where.filedAt = { ...where.filedAt as any, lte: new Date(query.endDate) };

    // 检察官办案统计
    const prosecutorStats = await this.prisma.case.groupBy({
      by: ['handlerName'],
      where: { ...where, handlerName: { not: null } },
      _count: true,
    });

    // 平均办结时长
    const closedCases = await this.prisma.case.findMany({
      where: { ...where, status: 'closed', closedAt: { not: null } },
      select: { filedAt: true, closedAt: true },
    });

    let avgDuration = 0;
    if (closedCases.length > 0) {
      const totalDays = closedCases.reduce((sum, c) => {
        return sum + dayjs(c.closedAt!).diff(dayjs(c.filedAt), 'day');
      }, 0);
      avgDuration = Math.round(totalDays / closedCases.length);
    }

    // 采纳率统计
    const decisionStats = await this.prisma.case.groupBy({
      by: ['reviewConclusion'],
      where: { ...where, reviewConclusion: { not: null } },
      _count: true,
    });

    const totalDecided = decisionStats.reduce((sum, s) => sum + s._count, 0);
    const accepted = decisionStats.find((s) => s.reviewConclusion === 'accepted')?._count || 0;

    // 文书统计
    const docStats = await this.prisma.document.groupBy({
      by: ['status'],
      _count: true,
    });

    return {
      avgDuration,
      closedCases: closedCases.length,
      adoptionRate: totalDecided > 0 ? Math.round((accepted / totalDecided) * 100) : 0,
      prosecutorWorkload: prosecutorStats.map((s) => ({
        name: s.handlerName,
        count: s._count,
      })),
      documentStats: docStats.map((s) => ({
        status: s.status,
        count: s._count,
      })),
    };
  }

  async getTrendData(period: 'day' | 'week' | 'month', limit: number = 30) {
    const data: { date: string; clues: number; cases: number; closed: number }[] = [];
    const format = period === 'day' ? 'YYYY-MM-DD' : period === 'week' ? 'YYYY-WW' : 'YYYY-MM';

    for (let i = limit - 1; i >= 0; i--) {
      const date = dayjs().subtract(i, period);
      const start = date.startOf(period).toDate();
      const end = date.endOf(period).toDate();

      const [clues, cases, closed] = await Promise.all([
        this.prisma.clue.count({ where: { createdAt: { gte: start, lte: end } } }),
        this.prisma.case.count({ where: { filedAt: { gte: start, lte: end } } }),
        this.prisma.case.count({ where: { closedAt: { gte: start, lte: end } } }),
      ]);

      data.push({ date: date.format(format), clues, cases, closed });
    }

    return data;
  }

  private getSourceLabel(source: string): string {
    const map: Record<string, string> = {
      frontend: '前端自主填报',
      hotline_12345: '12345热线',
      dept_share: '部门共享',
      unit_transfer: '单位移送',
    };
    return map[source] || source;
  }

  private getClaimTypeLabel(type: string): string {
    const map: Record<string, string> = {
      support_prosecution: '支持起诉申请',
      wage_complaint: '欠薪投诉举报',
      legal_consult: '法律咨询',
      other: '其他',
    };
    return map[type] || type;
  }
}
