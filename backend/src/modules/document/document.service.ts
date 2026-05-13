import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';

const DOC_TYPE_LABELS: Record<string, string> = {
  support_prosecution: '支持起诉书',
  civil_complaint: '民事起诉状',
  civil_judgment: '民事判决书',
  support_letter: '支持起诉意见书',
  inquiry_record: '询问笔录',
  evidence_list: '证据目录',
  service_receipt: '送达回证',
  case_report: '案件审结报告',
};

@Injectable()
export class DocumentService {
  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
  ) {}

  async getTemplates(category?: string) {
    const where: Prisma.DocumentTemplateWhereInput = { status: 'active' };
    if (category) where.category = category;

    return this.prisma.documentTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        docType: true,
        category: true,
        version: true,
        variables: true,
        originalFileName: true,
        filePath: true,
        fileSize: true,
        mimeType: true,
      },
    });
  }

  async generateDocument(
    caseId: string,
    operatorId: string,
    operatorName: string,
    options: { templateId?: string; docType?: string },
  ) {
    if (!options.templateId && !options.docType) {
      throw new BadRequestException('请选择文书类型或模板');
    }

    const caseEntity = await this.prisma.case.findUnique({
      where: { id: caseId },
      include: { reviewResults: true },
    });
    if (!caseEntity) throw new NotFoundException('案件不存在');

    this.assertGeneratable(caseEntity);

    const template = await this.resolveTemplate(options);
    const generatedContent = await this.aiService.generateDocument({
      docType: template.docType,
      caseNo: caseEntity.caseNo,
      applicantName: caseEntity.applicantName,
      respondentName: caseEntity.respondentName,
      claimContent: caseEntity.description || '',
      amount: Number(caseEntity.amount || 0),
      personCount: caseEntity.personCount,
      reviewConclusion: caseEntity.reviewConclusion || undefined,
      evidenceSummary: this.buildEvidenceSummary(caseEntity.reviewResults),
      handlerName: operatorName,
      filedAt: caseEntity.filedAt?.toISOString(),
    });

    const docNo = `WS-${dayjs().format('YYYYMMDD')}-${uuidv4().substring(0, 4).toUpperCase()}`;
    const docTypeLabel = DOC_TYPE_LABELS[template.docType] || template.category || template.docType;

    return this.prisma.document.create({
      data: {
        docNo,
        caseId,
        docType: template.docType,
        title: `${caseEntity.caseNo}-${docTypeLabel}`,
        content: generatedContent,
        templateId: template.id,
        status: 'draft',
        version: 1,
        currentLevel: 0,
        createdById: operatorId,
        createdByName: operatorName,
      },
    });
  }

  async findAll(caseId?: string) {
    const where: Prisma.DocumentWhereInput = {};
    if (caseId) where.caseId = caseId;

    return this.prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        docNo: true,
        caseId: true,
        docType: true,
        title: true,
        status: true,
        version: true,
        currentLevel: true,
        createdByName: true,
        createdAt: true,
        updatedAt: true,
        signedAt: true,
        case: { select: { id: true, caseNo: true, title: true, applicantName: true, respondentName: true } },
      },
    });
  }

  async findGroupedByCase() {
    const [cases, unassignedDocuments] = await Promise.all([
      this.prisma.case.findMany({
        where: { documents: { some: {} } },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          caseNo: true,
          title: true,
          applicantName: true,
          respondentName: true,
          status: true,
          documents: {
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              docNo: true,
              caseId: true,
              docType: true,
              title: true,
              status: true,
              version: true,
              currentLevel: true,
              createdByName: true,
              createdAt: true,
              updatedAt: true,
              signedAt: true,
            },
          },
        },
      }),
      this.prisma.document.findMany({
        where: { caseId: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          docNo: true,
          caseId: true,
          docType: true,
          title: true,
          status: true,
          version: true,
          currentLevel: true,
          createdByName: true,
          createdAt: true,
          updatedAt: true,
          signedAt: true,
        },
      }),
    ]);

    const groups = cases.map((item) => ({
      case: {
        id: item.id,
        caseNo: item.caseNo,
        title: item.title,
        applicantName: item.applicantName,
        respondentName: item.respondentName,
        status: item.status,
      },
      documents: item.documents,
    }));

    if (unassignedDocuments.length) {
      groups.push({
        case: {
          id: 'unassigned',
          caseNo: '未关联案件',
          title: '未关联案件文书',
          applicantName: '',
          respondentName: '',
          status: '',
        },
        documents: unassignedDocuments,
      });
    }

    return groups;
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        approvals: { orderBy: { level: 'asc' } },
        versions: { orderBy: { version: 'desc' }, take: 5 },
        case: true,
        template: true,
      },
    });
    if (!doc) throw new NotFoundException('文书不存在');
    return doc;
  }

  async updateDocument(id: string, content: string, operatorId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文书不存在');
    if (doc.status !== 'draft' && doc.status !== 'rejected') {
      throw new BadRequestException('只有草稿或被退回的文书可以编辑');
    }

    await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: doc.version,
        content: doc.content,
        createdBy: operatorId,
        createdByName: doc.createdByName,
        changeDesc: '修改文书内容',
      },
    });

    return this.prisma.document.update({
      where: { id },
      data: { content, version: { increment: 1 }, status: doc.status === 'rejected' ? 'draft' : doc.status },
    });
  }

  async submitForApproval(id: string, _operatorId: string, _operatorName: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文书不存在');

    const levels: { level: number; approverId: string; approverName: string }[] = [];
    const deptManager = await this.prisma.user.findFirst({ where: { role: { code: 'dept_head' } } });
    if (deptManager) levels.push({ level: 1, approverId: deptManager.id, approverName: deptManager.realName });

    const deputyChief = await this.prisma.user.findFirst({ where: { role: { code: 'deputy_chief' } } });
    if (deputyChief) levels.push({ level: 2, approverId: deputyChief.id, approverName: deputyChief.realName });

    await this.prisma.docApproval.deleteMany({ where: { documentId: id, status: 'pending' } });
    if (levels.length) {
      await this.prisma.docApproval.createMany({
        data: levels.map((level, index) => ({
          documentId: id,
          level: level.level,
          approverId: level.approverId,
          approverName: level.approverName,
          status: 'pending',
          sequence: index + 1,
        })),
      });
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: { status: 'submitted', currentLevel: levels[0]?.level || 0 },
    });

    if (levels[0]) {
      await this.prisma.notification.create({
        data: {
          userId: levels[0].approverId,
          type: 'approval',
          title: '新文书待审批',
          content: `文书《${doc.title}》需要您审批`,
          link: `/document/${id}`,
          priority: 'high',
        },
      });
    }

    return updated;
  }

  private getCurrentLevelRole(level: number): string | null {
    const roleMap: Record<number, string> = { 1: 'dept_head', 2: 'dept_chief' };
    return roleMap[level] || null;
  }

  async approve(id: string, approverId: string, opinion: string, signatureUrl?: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文书不存在');
    if (doc.status !== 'submitted') throw new BadRequestException('文书不在待审批状态');

    const roleCode = this.getCurrentLevelRole(doc.currentLevel);
    if (!roleCode) throw new BadRequestException('当前审批层级无效');

    const approval = await this.prisma.docApproval.findFirst({
      where: {
        documentId: id,
        level: doc.currentLevel,
        approver: { role: { code: roleCode } },
        status: 'pending',
      },
      include: { approver: { include: { role: true } } },
    });
    if (!approval) throw new BadRequestException('您没有待处理的审批任务');

    await this.prisma.docApproval.update({
      where: { id: approval.id },
      data: { status: 'approved', opinion, signatureUrl, actionAt: new Date() },
    });

    const pendingCount = await this.prisma.docApproval.count({ where: { documentId: id, status: 'pending' } });
    if (pendingCount === 0) {
      await this.prisma.document.update({
        where: { id },
        data: { status: 'approved', signedAt: new Date(), signedBy: approverId },
      });
    } else {
      const nextApproval = await this.prisma.docApproval.findFirst({
        where: { documentId: id, status: 'pending' },
        orderBy: { sequence: 'asc' },
      });
      if (nextApproval) {
        await this.prisma.document.update({ where: { id }, data: { currentLevel: nextApproval.level } });
        await this.prisma.notification.create({
          data: {
            userId: nextApproval.approverId,
            type: 'approval',
            title: '新文书待审批',
            content: `文书需要您（${nextApproval.approverName}）审批`,
            link: `/document/${id}`,
          },
        });
      }
    }

    return { message: '审批已完成' };
  }

  async reject(id: string, approverId: string, opinion: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文书不存在');
    if (doc.status !== 'submitted') throw new BadRequestException('文书不在待审批状态');

    const roleCode = this.getCurrentLevelRole(doc.currentLevel);
    if (!roleCode) throw new BadRequestException('当前审批层级无效');

    const approval = await this.prisma.docApproval.findFirst({
      where: {
        documentId: id,
        level: doc.currentLevel,
        approver: { role: { code: roleCode } },
        status: 'pending',
      },
    });
    if (!approval) throw new BadRequestException('您没有待处理的审批任务');

    await this.prisma.docApproval.update({
      where: { id: approval.id },
      data: { status: 'rejected', opinion, actionAt: new Date() },
    });
    await this.prisma.document.update({ where: { id }, data: { status: 'rejected' } });

    return { message: '文书已被退回' };
  }

  async getVersions(id: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, changeDesc: true, createdByName: true, createdAt: true },
    });
  }

  async archive(id: string, operatorId: string) {
    await this.prisma.document.update({
      where: { id },
      data: { status: 'archived', archivedAt: new Date(), archivedBy: operatorId },
    });
    return { message: '文书已归档' };
  }

  private async resolveTemplate(options: { templateId?: string; docType?: string }) {
    const template = options.templateId
      ? await this.prisma.documentTemplate.findUnique({ where: { id: options.templateId } })
      : await this.prisma.documentTemplate.findFirst({
          where: { docType: options.docType, status: 'active' },
          orderBy: { name: 'asc' },
        });

    if (!template) throw new NotFoundException('模板不存在');
    return template;
  }

  private assertGeneratable(caseEntity: {
    caseNo: string;
    applicantName: string;
    respondentName: string;
    description: string | null;
    amount: Prisma.Decimal | null;
    personCount: number;
  }) {
    const missing: string[] = [];
    if (!caseEntity.caseNo) missing.push('案件号');
    if (!caseEntity.applicantName) missing.push('申请人');
    if (!caseEntity.respondentName) missing.push('被申请人');
    if (!caseEntity.description?.trim()) missing.push('案情/诉求');
    if (caseEntity.amount === null || caseEntity.amount === undefined) missing.push('金额');
    if (caseEntity.personCount === null || caseEntity.personCount === undefined) missing.push('人数');

    if (missing.length) {
      throw new BadRequestException(`信息不全，无法生成：缺少${missing.join('、')}`);
    }
  }

  private buildEvidenceSummary(reviewResults: { dimension: string; result: string; reason: string | null }[]) {
    if (!reviewResults.length) return undefined;
    return reviewResults
      .map((item) => `${item.dimension}：${item.result}${item.reason ? `，${item.reason}` : ''}`)
      .join('\n');
  }
}
