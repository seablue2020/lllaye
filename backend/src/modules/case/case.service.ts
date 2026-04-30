import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CaseService {
  constructor(private prisma: PrismaService) {}

  async create(dto: {
    clueId?: string;
    applicantName: string;
    applicantIdNo: string;
    applicantPhone: string;
    respondentName: string;
    respondentOrg?: string;
    respondentContact?: string;
    amount?: number;
    personCount?: number;
    description?: string;
    title?: string;
    handlerId?: string;
    handlerName?: string;
  }) {
    const caseNo = `AJ-${dayjs().format('YYYYMMDD')}-${uuidv4().substring(0, 4).toUpperCase()}`;
    const title = dto.title || `${dto.applicantName}诉${dto.respondentName}欠薪支持起诉案`;

    return this.prisma.case.create({
      data: {
        caseNo,
        clueId: dto.clueId,
        title,
        description: dto.description,
        applicantName: dto.applicantName,
        applicantIdNo: dto.applicantIdNo,
        applicantPhone: dto.applicantPhone,
        respondentName: dto.respondentName,
        respondentOrg: dto.respondentOrg,
        respondentContact: dto.respondentContact,
        amount: dto.amount,
        personCount: dto.personCount || 1,
        status: 'under_review',
        handlerId: dto.handlerId,
        handlerName: dto.handlerName,
        filedAt: new Date(),
      },
    });
  }

  async list(params: {
    page?: number | string;
    pageSize?: number | string;
    status?: string;
    keyword?: string;
  }) {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 10;
    const skip = (page - 1) * pageSize;
    const { status, keyword } = params;

    const where: Prisma.CaseWhereInput = {};
    if (status) where.status = status;
    if (keyword) {
      where.OR = [
        { caseNo: { contains: keyword, mode: 'insensitive' } },
        { title: { contains: keyword, mode: 'insensitive' } },
        { applicantName: { contains: keyword, mode: 'insensitive' } },
        { respondentName: { contains: keyword, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.case.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.case.count({ where }),
    ]);

    return {
      list: data.map((item) => ({ ...item, amount: Number(item.amount || 0) })),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const caseEntity = await this.prisma.case.findUnique({
      where: { id },
      include: {
        documents: true,
        reviewResults: true,
      },
    });
    if (!caseEntity) throw new NotFoundException('案件不存在');
    return { ...caseEntity, amount: Number(caseEntity.amount || 0) };
  }
}
