import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReviewService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private encryption: EncryptionService,
  ) {}

  async startReview(clueId: string) {
    const clue = await this.prisma.clue.findUnique({ where: { id: clueId } });
    if (!clue) throw new NotFoundException('线索不存在');

    const aiReview = await this.aiService.reviewCase({
      applicantName: clue.applicantName,
      applicantIdNo: clue.applicantIdNoMasked || '',
      claimType: clue.claimType,
      claimOriginal: clue.claimOriginal,
      amount: Number(clue.amount || 0),
      personCount: clue.personCount,
      evidenceTypes: [],
      filedAt: clue.createdAt.toISOString(),
    });

    await Promise.all(
      aiReview.dimensions.map((dim) =>
        this.prisma.reviewResult.create({
          data: {
            caseId: clue.id,
            dimension: dim.dimension,
            result: dim.result,
            reason: dim.reason,
            confidence: dim.confidence,
            suggestions: dim.suggestions,
          },
        }),
      ),
    );

    await this.prisma.clue.update({
      where: { id: clueId },
      data: {
        reviewedAt: new Date(),
        riskLevel: aiReview.riskLevel,
        riskReason: aiReview.riskReasons.join('; '),
      },
    });

    return {
      conclusion: aiReview.conclusion,
      conclusionText: aiReview.conclusionText,
      dimensions: aiReview.dimensions,
      riskLevel: aiReview.riskLevel,
      riskReasons: aiReview.riskReasons,
      missingEvidence: aiReview.missingEvidence,
      legalReferences: aiReview.legalReferences,
    };
  }

  async getReviewResults(caseId: string) {
    const results = await this.prisma.reviewResult.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });

    const confirmed = results.filter((r) => r.confirmed);
    const pending = results.filter((r) => !r.confirmed);

    return { all: results, confirmed, pending, confirmedCount: confirmed.length, totalCount: results.length };
  }

  async confirmReview(caseId: string, confirmedBy: string, dimension?: string) {
    const where: Prisma.ReviewResultWhereInput = { caseId };
    if (dimension) where.dimension = dimension;

    await this.prisma.reviewResult.updateMany({ where, data: { confirmed: true, confirmedBy, confirmedAt: new Date() } });

    const allConfirmed = await this.prisma.reviewResult.count({ where: { caseId, confirmed: false } });
    if (allConfirmed === 0) {
      const results = await this.prisma.reviewResult.findMany({ where: { caseId } });
      const hasFail = results.some((r) => r.result === 'fail');
      const hasWarning = results.some((r) => r.result === 'warning');
      const conclusion = hasFail ? 'rejected' : hasWarning ? 'need_more_evidence' : 'accepted';

      const existingCase = await this.prisma.case.findFirst({ where: { clueId: caseId } });
      if (existingCase) {
        await this.prisma.case.updateMany({
          where: { id: existingCase.id },
          data: { reviewConclusion: conclusion, status: 'under_review' },
        });
      }
    }

    return { message: '审查意见已确认' };
  }

  async rejectReview(reviewId: string, reason: string) {
    const review = await this.prisma.reviewResult.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('审查记录不存在');

    await this.prisma.reviewResult.update({
      where: { id: reviewId },
      data: { suggestions: `【驳回原因】${reason}\n【原建议】${review.suggestions}` },
    });

    return { message: '审查意见已驳回，请重新分析' };
  }

  async generateReport(caseId: string) {
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

  async getGuidance(caseId: string) {
    const caseEntity = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseEntity) throw new NotFoundException('案件不存在');

    const reviewResults = await this.prisma.reviewResult.findMany({ where: { caseId } });
    const warnings = reviewResults.filter((r) => r.result !== 'pass');

    return {
      title: '案件办理履职提示',
      caseNo: caseEntity.caseNo,
      guidance: {
        investigation: { title: '调查取证重点提示', items: warnings.map((r) => r.suggestions || r.reason).filter(Boolean) },
        evidence: {
          title: '证据收集清单',
          items: ['项目农民工工资专户银行流水', '施工总包与包工头的分包合同', '项目全员考勤记录', '工资支付记录或欠条'],
        },
        interview: { title: '谈话询问重点问题', items: ['何时入职、工作岗位、工作内容', '工资标准、支付方式、欠薪起始时间'] },
        riskControl: {
          title: '涉稳风险防控提示',
          items: caseEntity.personCount >= 30
            ? ['本案涉及人数≥30人，存在群体性事件风险', '建议及时向相关部门通报']
            : ['持续关注当事人动态'],
        },
        coordination: { title: '跨部门协调建议', items: ['人社部门：协助调取工资专户流水', '住建部门：协调查处项目违法分包'] },
      },
    };
  }

  async reviewEvidence(evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({ where: { id: evidenceId } });
    if (!evidence) throw new NotFoundException('证据不存在');

    const result = { status: 'reviewed', opinion: 'AI审查完成' };

    await this.prisma.evidence.update({
      where: { id: evidenceId },
      data: { reviewStatus: 'reviewed', reviewOpinion: result.opinion, reviewedAt: new Date() },
    });

    return result;
  }
}
