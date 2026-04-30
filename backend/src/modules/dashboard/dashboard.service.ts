import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as dayjs from 'dayjs';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getMetrics() {
    const todayStart = dayjs().startOf('day').toDate();
    const todayEnd = dayjs().endOf('day').toDate();
    const monthStart = dayjs().startOf('month').toDate();

    const [
      pendingClues,
      keyClues,
      caseTotal,
      closedCases,
      todayClues,
      overdueClues,
      newCasesThisMonth,
      totalDecided,
      accepted,
    ] = await Promise.all([
      this.prisma.clue.count({ where: { status: 'pending_review' } }),
      this.prisma.clue.count({ where: { isKey: true, status: { notIn: ['closed', 'rejected'] } } }),
      this.prisma.case.count(),
      this.prisma.case.count({ where: { status: 'closed' } }),
      this.prisma.clue.count({ where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
      this.prisma.clue.count({
        where: {
          status: 'pending_review',
          createdAt: { lt: dayjs().subtract(3, 'day').toDate() },
        },
      }),
      this.prisma.case.count({ where: { filedAt: { gte: monthStart } } }),
      this.prisma.case.count({ where: { reviewConclusion: { in: ['accepted', 'rejected'] } } }),
      this.prisma.case.count({ where: { reviewConclusion: 'accepted' } }),
    ]);

    return {
      pendingClues,
      pendingCluesNew: todayClues,
      keyClues,
      keyCluesOverdue: overdueClues,
      processingCases: caseTotal,
      processingCasesNew: newCasesThisMonth,
      closedCases,
      adoptionRate: totalDecided > 0 ? Math.round((accepted / totalDecided) * 100) : 0,
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
        status: true,
        dueDate: true,
        createdAt: true,
      },
    });

    return tasks.map((task) => ({
      ...task,
      priorityLabel: this.getPriorityLabel(task.priority),
      typeLabel: this.getTaskTypeLabel(task.type),
      isOverdue: Boolean(task.dueDate && dayjs(task.dueDate).isBefore(dayjs())),
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

    return warnings.map((item) => ({
      ...item,
      amount: Number(item.amount || 0),
      riskReasonList: item.riskReason?.split(';').map((reason) => reason.trim()).filter(Boolean) || [],
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

    return clues.map((item) => ({
      ...item,
      tags: [
        item.riskLevel === 'high' ? '高风险' : null,
        item.isAggregated ? '联合线索' : null,
        item.claimType === 'support_prosecution' ? '支持起诉' : null,
      ].filter(Boolean),
    }));
  }

  private getPriorityLabel(priority: string) {
    const labels: Record<string, string> = {
      urgent: '紧急',
      high: '高',
      normal: '普通',
      low: '低',
    };
    return labels[priority] || priority;
  }

  private getTaskTypeLabel(type: string) {
    const labels: Record<string, string> = {
      clue_review: '线索研判',
      evidence_review: '证据审查',
      document_approval: '文书审核',
      supervision: '督办',
    };
    return labels[type] || '其他';
  }
}
