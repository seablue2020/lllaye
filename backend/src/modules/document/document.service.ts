import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

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
      orderBy: [{ category: 'asc' }],
      select: { id: true, name: true, code: true, docType: true, category: true, version: true, variables: true },
    });
  }

  async generateDocument(caseId: string, templateId: string, operatorId: string, operatorName: string) {
    const caseEntity = await this.prisma.case.findUnique({ where: { id: caseId } });
    if (!caseEntity) throw new NotFoundException('案件不存在');

    const template = await this.prisma.documentTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException('模板不存在');

    const generatedContent = await this.aiService.generateDocument({
      docType: template.docType,
      caseNo: caseEntity.caseNo,
      applicantName: caseEntity.applicantName,
      respondentName: caseEntity.respondentName,
      claimContent: caseEntity.description || '',
      amount: Number(caseEntity.amount || 0),
      personCount: caseEntity.personCount,
      projectName: '',
      handlerName: operatorName,
      filedAt: caseEntity.filedAt?.toISOString(),
    });

    const docNo = `WS-${dayjs().format('YYYYMMDD')}-${uuidv4().substring(0, 4).toUpperCase()}`;

    return this.prisma.document.create({
      data: {
        docNo,
        caseId,
        docType: template.docType,
        title: template.name,
        content: generatedContent,
        templateId,
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
      select: { id: true, docNo: true, docType: true, title: true, status: true, version: true, currentLevel: true, createdByName: true, createdAt: true, updatedAt: true, signedAt: true },
    });
  }

  async findOne(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: { approvals: { orderBy: { level: 'asc' } }, versions: { orderBy: { version: 'desc' }, take: 5 }, case: true },
    });
    if (!doc) throw new NotFoundException('文书不存在');
    return doc;
  }

  async updateDocument(id: string, content: string, operatorId: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文书不存在');
    if (doc.status !== 'draft' && doc.status !== 'rejected') throw new BadRequestException('只有草稿或被退回的文书可以编辑');

    await this.prisma.documentVersion.create({
      data: { documentId: id, version: doc.version, content: doc.content, createdBy: operatorId, createdByName: doc.createdByName, changeDesc: '修改文书内容' },
    });

    return this.prisma.document.update({ where: { id }, data: { content, version: { increment: 1 }, status: doc.status === 'rejected' ? 'draft' : doc.status } });
  }

  async submitForApproval(id: string, operatorId: string, operatorName: string) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('文书不存在');

    const levels: { level: number; approverId: string; approverName: string }[] = [];
    const deptManager = await this.prisma.user.findFirst({ where: { role: { code: 'dept_head' } } });
    if (deptManager) levels.push({ level: 1, approverId: deptManager.id, approverName: deptManager.realName });

    const deputyChief = await this.prisma.user.findFirst({ where: { role: { code: 'deputy_chief' } } });
    if (deputyChief) levels.push({ level: 2, approverId: deputyChief.id, approverName: deputyChief.realName });

    await this.prisma.docApproval.createMany({
      data: levels.map((level, index) => ({ documentId: id, level: level.level, approverId: level.approverId, approverName: level.approverName, status: 'pending', sequence: index + 1 })),
    });

    const updated = await this.prisma.document.update({ where: { id }, data: { status: 'submitted', currentLevel: 1 } });

    if (levels[0]) {
      await this.prisma.notification.create({
        data: { userId: levels[0].approverId, type: 'approval', title: '新文书待审批', content: `文书《${doc.title}》需要您的审批`, link: `/document/${id}`, priority: 'high' },
      });
    }

    return updated;
  }

  async approve(id: string, approverId: string, opinion: string, signatureUrl?: string) {
    const approval = await this.prisma.docApproval.findFirst({ where: { documentId: id, approverId, status: 'pending' }, orderBy: { sequence: 'asc' } });
    if (!approval) throw new BadRequestException('您没有待处理的审批任务');

    await this.prisma.docApproval.update({ where: { id: approval.id }, data: { status: 'approved', opinion, signatureUrl, actionAt: new Date() } });

    const pendingCount = await this.prisma.docApproval.count({ where: { documentId: id, status: 'pending' } });

    if (pendingCount === 0) {
      await this.prisma.document.update({ where: { id }, data: { status: 'approved', signedAt: new Date(), signedBy: approverId } });
    } else {
      const nextApproval = await this.prisma.docApproval.findFirst({ where: { documentId: id, status: 'pending' }, orderBy: { sequence: 'asc' } });
      if (nextApproval) {
        await this.prisma.document.update({ where: { id }, data: { currentLevel: nextApproval.level } });
        await this.prisma.notification.create({ data: { userId: nextApproval.approverId, type: 'approval', title: '新文书待审批', content: `文书需要您（${nextApproval.approverName}）的审批`, link: `/document/${id}` } });
      }
    }

    return { message: '审批已完成' };
  }

  async reject(id: string, approverId: string, opinion: string) {
    const approval = await this.prisma.docApproval.findFirst({ where: { documentId: id, approverId, status: 'pending' } });
    if (!approval) throw new BadRequestException('您没有待处理的审批任务');

    await this.prisma.docApproval.update({ where: { id: approval.id }, data: { status: 'rejected', opinion, actionAt: new Date() } });
    await this.prisma.document.update({ where: { id }, data: { status: 'rejected' } });

    return { message: '文书已被退回' };
  }

  async getVersions(id: string) {
    return this.prisma.documentVersion.findMany({ where: { documentId: id }, orderBy: { version: 'desc' }, select: { id: true, version: true, changeDesc: true, createdByName: true, createdAt: true } });
  }

  async archive(id: string, operatorId: string) {
    await this.prisma.document.update({ where: { id }, data: { status: 'archived', archivedAt: new Date(), archivedBy: operatorId } });
    return { message: '文书已归档' };
  }
}
