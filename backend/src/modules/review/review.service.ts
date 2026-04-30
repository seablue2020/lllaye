import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private encryption: EncryptionService,
  ) {}

  async startReview(caseIdOrClueId: string) {
    const resolvedCaseId = await this.resolveCaseId(caseIdOrClueId);
    if (!resolvedCaseId) {
      return this.reviewClue(caseIdOrClueId);
    }

    const caseEntity = await this.prisma.case.findUnique({ where: { id: resolvedCaseId } });
    if (!caseEntity) throw new NotFoundException('案件不存在');

    const clue = caseEntity.clueId
      ? await this.prisma.clue.findUnique({ where: { id: caseEntity.clueId } })
      : null;

    const aiReview = await this.aiService.reviewCase({
      applicantName: caseEntity.applicantName,
      applicantIdNo: clue?.applicantIdNoMasked || this.safeDecrypt(caseEntity.applicantIdNo),
      claimType: clue?.claimType || caseEntity.caseType || 'support_prosecution',
      claimOriginal: clue?.claimOriginal || caseEntity.description || '',
      amount: Number(caseEntity.amount || 0),
      personCount: caseEntity.personCount,
      evidenceTypes: [],
      filedAt: clue?.createdAt?.toISOString() || caseEntity.createdAt.toISOString(),
      projectName: clue?.projectName || undefined,
      respondentName: caseEntity.respondentName,
      respondentOrg: caseEntity.respondentOrg || undefined,
      subjectName: clue?.subjectName || undefined,
      subjectType: clue?.subjectType || undefined,
      claimSource: clue?.source || undefined,
    });

    await this.prisma.reviewResult.deleteMany({ where: { caseId: resolvedCaseId } });
    await Promise.all(
      aiReview.dimensions.map((dimension) =>
        this.prisma.reviewResult.create({
          data: {
            caseId: resolvedCaseId,
            dimension: dimension.dimension,
            result: dimension.result,
            reason: dimension.reason,
            confidence: dimension.confidence,
            suggestions: dimension.suggestions,
          },
        }),
      ),
    );

    await this.prisma.case.update({
      where: { id: resolvedCaseId },
      data: {
        aiReviewResult: {
          ...aiReview,
          reviewedAt: new Date().toISOString(),
        } as any,
      },
    });

    if (clue) {
      await this.prisma.clue.update({
        where: { id: clue.id },
        data: {
          reviewedAt: new Date(),
          riskLevel: aiReview.riskLevel,
          riskReason: aiReview.riskReasons.join('; '),
        },
      });
    }

    return aiReview;
  }

  async getReviewResults(caseIdOrClueId: string) {
    const caseId = await this.resolveCaseId(caseIdOrClueId);
    if (!caseId) return { all: [], confirmed: [], pending: [], confirmedCount: 0, totalCount: 0 };

    const results = await this.prisma.reviewResult.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
    const normalized = results.map((item) => ({
      ...item,
      confidence: Number(item.confidence || 0),
    }));
    const confirmed = normalized.filter((item) => item.confirmed);
    const pending = normalized.filter((item) => !item.confirmed);
    return { all: normalized, confirmed, pending, confirmedCount: confirmed.length, totalCount: normalized.length };
  }

  async confirmReview(caseIdOrClueId: string, confirmedBy: string, dimension?: string) {
    const caseId = await this.resolveCaseId(caseIdOrClueId);
    if (!caseId) throw new NotFoundException('案件不存在');

    const where: Prisma.ReviewResultWhereInput = { caseId };
    if (dimension) where.dimension = dimension;

    await this.prisma.reviewResult.updateMany({
      where,
      data: { confirmed: true, confirmedBy, confirmedAt: new Date() },
    });

    const unconfirmedCount = await this.prisma.reviewResult.count({ where: { caseId, confirmed: false } });
    if (unconfirmedCount === 0) {
      const results = await this.prisma.reviewResult.findMany({ where: { caseId } });
      const hasFail = results.some((item) => item.result === 'fail');
      const hasWarning = results.some((item) => item.result === 'warning');
      const conclusion = hasFail ? 'rejected' : hasWarning ? 'need_more_evidence' : 'accepted';
      await this.prisma.case.update({
        where: { id: caseId },
        data: { reviewConclusion: conclusion, status: 'under_review' },
      });
    }

    return { message: '审查意见已确认' };
  }

  async rejectReview(reviewId: string, reason: string) {
    const review = await this.prisma.reviewResult.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('审查记录不存在');
    if (!reason) throw new BadRequestException('请填写驳回原因');

    await this.prisma.reviewResult.update({
      where: { id: reviewId },
      data: {
        confirmed: false,
        suggestions: `【驳回原因】${reason}\n【原建议】${review.suggestions || ''}`,
      },
    });

    return { message: '审查意见已驳回，请重新分析' };
  }

  async generateReport(caseIdOrClueId: string) {
    const caseId = await this.resolveCaseId(caseIdOrClueId);
    if (!caseId) throw new NotFoundException('案件不存在');

    const caseEntity = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseEntity) throw new NotFoundException('案件不存在');

    const report = await this.aiService.generateInitialReport(caseId, {
      caseNo: caseEntity.caseNo,
      applicantName: caseEntity.applicantName,
      respondentName: caseEntity.respondentName,
      amount: Number(caseEntity.amount || 0),
      personCount: caseEntity.personCount,
      description: caseEntity.description || '',
      evidenceCount: 0,
    });

    await this.prisma.reviewReport.upsert({
      where: { caseId },
      create: { caseId, content: report, generatedBy: 'AI' },
      update: { content: report },
    });

    return { report };
  }

  async getGuidance(caseIdOrClueId: string) {
    const caseId = await this.resolveCaseId(caseIdOrClueId);
    const caseEntity = caseId ? await this.prisma.case.findUnique({ where: { id: caseId } }) : null;
    const reviewResults = caseId ? await this.prisma.reviewResult.findMany({ where: { caseId } }) : [];
    const warnings = reviewResults.filter((item) => item.result !== 'pass');
    const highRisk = (caseEntity?.personCount || 0) >= 30 || Number(caseEntity?.amount || 0) >= 500000;

    return {
      title: '案件办理履职提示',
      caseNo: caseEntity?.caseNo,
      guidance: {
        investigation: {
          title: '调查取证重点提示',
          items: warnings.length
            ? warnings.map((item) => item.suggestions || item.reason).filter(Boolean)
            : ['核实劳动关系、欠薪期间、工资标准和已支付金额。'],
        },
        evidence: {
          title: '证据收集清单',
          items: ['劳动合同或实际用工证明', '考勤记录', '工资表及结算单', '银行流水', '项目分包或劳务合同', '欠薪确认材料'],
        },
        interview: {
          title: '谈话询问重点问题',
          items: ['入职时间、工作岗位、工作内容', '工资标准、支付方式、欠薪起止时间', '用工管理人员和工资结算人员', '是否存在多人共同欠薪诉求'],
        },
        riskControl: {
          title: '涉稳风险防控提示',
          items: highRisk
            ? ['本案人数或金额达到高风险阈值，建议优先办理。', '建议同步向相关部门通报并做好稳控预案。']
            : ['持续关注当事人动态，避免矛盾升级。'],
        },
        coordination: {
          title: '跨部门协同建议',
          items: ['人社部门：协助调取工资支付和投诉处理记录。', '住建部门：协调查明项目总包、分包和劳务责任链条。'],
        },
      },
    };
  }

  async reviewEvidence(evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException('证据不存在');

    await this.prisma.evidence.update({
      where: { id: evidenceId },
      data: { reviewStatus: 'reviewed', reviewOpinion: 'AI审查完成', reviewedAt: new Date() },
    });

    return { status: 'reviewed', opinion: 'AI审查完成' };
  }

  private async reviewClue(clueId: string) {
    const clue = await this.prisma.clue.findUnique({ where: { id: clueId } });
    if (!clue) throw new NotFoundException('案件或线索不存在');

    const aiReview = await this.aiService.reviewCase({
      applicantName: clue.applicantName,
      applicantIdNo: clue.applicantIdNoMasked || '',
      claimType: clue.claimType,
      claimOriginal: clue.claimOriginal,
      amount: Number(clue.amount || 0),
      personCount: clue.personCount,
      evidenceTypes: [],
      filedAt: clue.createdAt.toISOString(),
      projectName: clue.projectName,
      respondentName: clue.subjectName,
      subjectName: clue.subjectName,
      subjectType: clue.subjectType,
      claimSource: clue.source,
    });

    await this.prisma.clue.update({
      where: { id: clue.id },
      data: {
        reviewedAt: new Date(),
        riskLevel: aiReview.riskLevel,
        riskReason: aiReview.riskReasons.join('; '),
      },
    });

    return aiReview;
  }

  private async resolveCaseId(id: string): Promise<string | null> {
    const byCase = await this.prisma.case.findUnique({ where: { id } });
    if (byCase) return byCase.id;
    const byClue = await this.prisma.case.findFirst({ where: { clueId: id } });
    return byClue?.id || null;
  }

  private safeDecrypt(value: string) {
    try {
      return this.encryption.decrypt(value);
    } catch {
      return value || '';
    }
  }
}
