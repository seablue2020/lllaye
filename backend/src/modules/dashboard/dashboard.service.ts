import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { RedisService } from '../../common/redis/redis.service';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getMetrics() {
    const today = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();

    const [
      pendingClues,
      keyClues,
      processingCases,
      closedCases,
      todayClues,
      overdueClues,
    ] = await Promise.all([
      this.prisma.clue.count({ where: { status: 'pending_review' } }),
      this.prisma.clue.count({ where: { status: 'under_review', isKey: true } }),
      this.prisma.case.count({ where: { status: { in: ['under_review', 'investigating', 'document_review'] } } }),
      this.prisma.case.count({ where: { status: 'closed' } }),
      this.prisma.clue.count({ where: { createdAt: { gte: today, lt: todayEnd } } }),
      this.prisma.clue.count({
        where: {
          status: 'pending_review',
          createdAt: { lt: dayjs().subtract(3, 'day').toDate() },
        },
      }),
    ]);

    // 计算采纳率
    const totalDecided = await this.prisma.case.count({
      where: { reviewConclusion: { in: ['accepted', 'rejected'] } },
    });
    const accepted = await this.prisma.case.count({
      where: { reviewConclusion: 'accepted' },
    });
    const adoptionRate = totalDecided > 0 ? Math.round((accepted / totalDecided) * 100) : 0;

    // 本月新受理
    const monthStart = dayjs().startOf('month').toDate();
    const newCasesThisMonth = await this.prisma.case.count({
      where: { filedAt: { gte: monthStart } },
    });

    return {
      pendingClues,
      pendingCluesNew: todayClues,
      keyClues,
      keyCluesOverdue: overdueClues,
      processingCases,
      processingCasesNew: newCasesThisMonth,
      closedCases,
      adoptionRate,
    };
  }

  async getTasks(userId: string) {
    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: userId,
        status: { in: ['pending', 'in_progress'] },
      },
      orderBy: [
        { priority: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ],
      take: 20,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        bizId: true,
        bizType: true,
        priority: true,
        dueDate: true,
        createdAt: true,
      },
    });

    return tasks.map((task) => ({
      ...task,
      priorityLabel:
        task.priority === 'urgent'
          ? '紧急'
          : task.priority === 'high'
          ? '高'
          : task.priority === 'low'
          ? '低'
          : '普通',
      typeLabel:
        task.type === 'clue_review'
          ? '待研判'
          : task.type === 'evidence_review'
          ? '待取证'
          : task.type === 'document_approval'
          ? '待文书审核'
          : '其他',
      isOverdue: task.dueDate && dayjs(task.dueDate).isBefore(dayjs()),
    }));
  }

  async getRiskWarnings() {
    const warnings = await this.prisma.clue.findMany({
      where: {
        riskLevel: 'high',
        status: { notIn: ['closed', 'rejected'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        clueNo: true,
        subjectName: true,
        personCount: true,
        amount: true,
        riskLevel: true,
        riskReason: true,
        projectName: true,
        status: true,
        createdAt: true,
      },
    });

    return warnings.map((w) => ({
      ...w,
      riskReasonList: w.riskReason?.split(';').filter(Boolean) || [],
    }));
  }

  async getTodayDynamics() {
    const today = dayjs().startOf('day').toDate();
    const clues = await this.prisma.clue.findMany({
      where: { createdAt: { gte: today } },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        clueNo: true,
        applicantName: true,
        subjectName: true,
        projectName: true,
        claimType: true,
        riskLevel: true,
        isAggregated: true,
        status: true,
        createdAt: true,
      },
    });

    return clues.map((c) => ({
      ...c,
      tags: [
        c.riskLevel === 'high' ? '高风险' : null,
        c.isAggregated ? '聚合线索' : null,
        c.claimType === 'support_prosecution' ? '支持起诉' : null,
      ].filter(Boolean),
    }));
  }
}
