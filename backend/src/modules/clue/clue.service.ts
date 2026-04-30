import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EncryptionService } from '../../common/encryption/encryption.service';
import { RedisService } from '../../common/redis/redis.service';
import { CreateClueDto, ClueQueryDto, ClueTriageDto, AggregateClueDto } from './dto/clue.dto';
import { Prisma } from '@prisma/client';
import * as dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ClueService {
  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
    private redis: RedisService,
  ) {}

  async create(dto: CreateClueDto) {
    const clueNo = await this.generateClueNo();
    const encryptedIdNo = this.encryption.encrypt(dto.applicantIdNo);
    const encryptedPhone = this.encryption.encrypt(dto.phone);

    const clue = await this.prisma.clue.create({
      data: {
        clueNo,
        applicantName: dto.applicantName,
        applicantIdNo: encryptedIdNo,
        applicantIdNoMasked: this.encryption.maskIdNo(dto.applicantIdNo),
        phone: encryptedPhone,
        phoneMasked: this.encryption.maskPhone(dto.phone),
        subjectType: dto.subjectType,
        subjectName: dto.subjectName,
        subjectIdNo: dto.subjectIdNo,
        subjectContact: dto.subjectContact,
        projectName: dto.projectName,
        projectAddress: dto.projectAddress,
        amount: dto.amount,
        personCount: dto.personCount,
        claimType: dto.claimType,
        claimOriginal: dto.claimOriginal,
        source: dto.source,
        sourceDetail: dto.sourceDetail,
        status: 'pending_review',
        isKey: dto.claimType === 'support_prosecution',
      },
    });

    await this.prisma.clueFlowRecord.create({
      data: { clueId: clue.id, node: 'submit', action: '提交线索', status: 'completed' },
    });

    this.triggerAiPreAnalysis(clue.id, dto);

    if (clue.isKey) {
      await this.createKeyClueTask(clue);
    }

    return clue;
  }

  async findAll(query: ClueQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: Prisma.ClueWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.riskLevel) where.riskLevel = query.riskLevel;
    if (query.claimType) where.claimType = query.claimType;
    if (query.source) where.source = query.source;
    if (query.isKey !== undefined) where.isKey = query.isKey;
    if (query.isAggregated !== undefined) where.isAggregated = query.isAggregated;
    if (query.startDate) {
      const start = new Date(query.startDate);
      where.createdAt = { ...(where.createdAt as any || {}), gte: start };
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      where.createdAt = { ...(where.createdAt as any || {}), lte: end };
    }
    if (query.keyword) {
      where.OR = [
        { clueNo: { contains: query.keyword, mode: 'insensitive' } },
        { applicantName: { contains: query.keyword, mode: 'insensitive' } },
        { subjectName: { contains: query.keyword, mode: 'insensitive' } },
        { projectName: { contains: query.keyword, mode: 'insensitive' } },
        { claimOriginal: { contains: query.keyword, mode: 'insensitive' } },
      ];
    }

    const [clues, total] = await Promise.all([
      this.prisma.clue.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { [query.sortField || 'createdAt']: query.sortOrder || 'desc' },
        select: {
          id: true, clueNo: true, applicantName: true, applicantIdNoMasked: true, phoneMasked: true,
          subjectType: true, subjectName: true, projectName: true, projectAddress: true,
          amount: true, personCount: true, claimType: true, status: true, riskLevel: true,
          isKey: true, isAggregated: true, aggregateNo: true, source: true, createdAt: true, updatedAt: true,
        },
      }),
      this.prisma.clue.count({ where }),
    ]);

    return { list: clues, total, page, pageSize };
  }

  async findOne(id: string) {
    const clue = await this.prisma.clue.findUnique({
      where: { id },
      include: {
        evidence: true,
        flowRecords: { orderBy: { createdAt: 'asc' } },
        duplicateOf: { include: { duplicateClue: { select: { clueNo: true, applicantName: true, createdAt: true } } } },
        duplicatedBy: { include: { mainClue: { select: { clueNo: true, applicantName: true, createdAt: true } } } },
        handler: { select: { id: true, realName: true } },
      },
    });
    if (!clue) throw new NotFoundException('线索不存在');
    return clue;
  }

  async triage(id: string, dto: ClueTriageDto, operatorId: string, operatorName: string) {
    const clue = await this.prisma.clue.findUnique({ where: { id } });
    if (!clue) throw new NotFoundException('线索不存在');

    const updateData: Prisma.ClueUpdateInput = {
      triageOpinion: dto.opinion,
      triageAt: new Date(),
    };
    updateData['handler'] = { connect: { id: operatorId } };

    let nextStatus: string;
    let flowAction: string;

    switch (dto.action) {
      case 'accept':
        nextStatus = 'under_review';
        flowAction = '受理';
        await this.createCaseFromClue(clue, operatorId, operatorName);
        break;
      case 'reject':
        nextStatus = 'rejected';
        flowAction = '不予受理';
        updateData['rejectionReason'] = dto.rejectionReason;
        break;
      case 'transfer':
        nextStatus = 'triaged';
        flowAction = `移送至 ${dto.assigneeId}`;
        break;
      default:
        throw new BadRequestException('无效的分流操作');
    }
    updateData['status'] = nextStatus;

    await Promise.all([
      this.prisma.clue.update({ where: { id }, data: updateData }),
      this.prisma.clueFlowRecord.create({
        data: { clueId: id, node: 'triage', action: flowAction, operatorId, operatorName, opinion: dto.opinion, status: 'completed' },
      }),
      this.prisma.task.updateMany({
        where: { bizId: id, type: 'clue_review' },
        data: { status: 'completed', completedAt: new Date(), opinion: dto.opinion },
      }),
    ]);

    return { id, status: nextStatus };
  }

  async aggregate(dto: AggregateClueDto, operatorId: string, operatorName: string) {
    const aggregateNo = `AGG-${dayjs().format('YYYYMMDD')}-${uuidv4().substring(0, 4).toUpperCase()}`;
    const where: Prisma.ClueWhereInput = { status: { in: ['pending_review', 'under_review'] }, isAggregated: false };
    if (dto.clueIds?.length) where.id = { in: dto.clueIds };

    const clues = await this.prisma.clue.findMany({ where });
    if (clues.length < 2) throw new BadRequestException('聚合至少需要2条线索');

    const groups = this.groupCluesByDimension(clues, dto.dimension);
    const results: any[] = [];

    for (const group of groups) {
      if (group.length < 2) continue;
      const aggregate = await this.prisma.caseAggregate.create({
        data: {
          aggregateNo: `${aggregateNo}-${results.length + 1}`,
          name: `批量欠薪 - ${group[0].projectName}`,
          description: `共 ${group.length} 条线索聚合`,
          aggregateType: dto.dimension,
          totalAmount: group.reduce((sum, c) => sum + Number(c.amount || 0), 0),
          totalPersonCount: group.reduce((sum, c) => sum + c.personCount, 0),
          clueCount: group.length,
          createdBy: operatorId,
          createdByName: operatorName,
          aggregateClues: {
            create: group.map((clue, index) => ({
              clueId: clue.id,
              similarityScore: 1.0 - index * 0.05,
              isRepresentative: index === 0,
              addedBy: operatorId,
            })),
          },
        },
        include: { aggregateClues: { include: { clue: true } } },
      });

      await this.prisma.clue.updateMany({
        where: { id: { in: group.map((c) => c.id) } },
        data: { isAggregated: true, aggregateNo: aggregate.aggregateNo },
      });

      results.push(aggregate);
    }
    return results;
  }

  async findDuplicates(id: string) {
    const clue = await this.prisma.clue.findUnique({
      where: { id },
      select: { applicantName: true, subjectName: true, projectName: true },
    });
    if (!clue) throw new NotFoundException('线索不存在');

    return this.prisma.clue.findMany({
      where: {
        id: { not: id },
        OR: [{ applicantName: clue.applicantName }, { subjectName: clue.subjectName }, { projectName: clue.projectName }],
        status: { not: 'rejected' },
      },
      select: { id: true, clueNo: true, applicantName: true, applicantIdNoMasked: true, projectName: true, subjectName: true, claimOriginal: true, status: true, createdAt: true },
      take: 10,
    });
  }

  async getTimeline(id: string) {
    const clue = await this.prisma.clue.findUnique({ where: { id }, select: { clueNo: true } });
    if (!clue) throw new NotFoundException('线索不存在');

    const records = await this.prisma.clueFlowRecord.findMany({
      where: { clueId: id },
      orderBy: { createdAt: 'asc' },
      select: { node: true, action: true, operatorName: true, opinion: true, status: true, createdAt: true },
    });

    return { clueNo: clue.clueNo, records };
  }

  async getHeatmapData() {
    const clues = await this.prisma.clue.findMany({
      where: {
        projectAddressStd: { not: Prisma.JsonNull },
      },
      select: { projectAddressStd: true, amount: true, personCount: true, riskLevel: true },
    });

    const regionMap = new Map<string, { count: number; totalAmount: number; totalPerson: number; highRisk: number }>();

    for (const clue of clues) {
      const addr = clue.projectAddressStd as any;
      const region = addr?.district || '未知区域';
      const existing = regionMap.get(region) || { count: 0, totalAmount: 0, totalPerson: 0, highRisk: 0 };
      regionMap.set(region, {
        count: existing.count + 1,
        totalAmount: existing.totalAmount + Number(clue.amount || 0),
        totalPerson: existing.totalPerson + clue.personCount,
        highRisk: existing.highRisk + (clue.riskLevel === 'high' ? 1 : 0),
      });
    }

    return Array.from(regionMap.entries()).map(([name, data]) => ({ name, value: data.count, amount: data.totalAmount, personCount: data.totalPerson, highRisk: data.highRisk }));
  }

  private async generateClueNo(): Promise<string> {
    const today = dayjs().format('YYYYMMDD');
    const key = `clue:no:${today}`;
    const count = await this.redis.incr(key);
    await this.redis.expire(key, 86400);
    return `CX-${today}-${String(count).padStart(4, '0')}`;
  }

  private async triggerAiPreAnalysis(clueId: string, dto: CreateClueDto) {
    const analysis = {
      riskLevel: dto.personCount >= 30 ? 'high' : dto.personCount >= 10 ? 'medium' : 'low',
      riskReasons: [
        ...(dto.personCount >= 30 ? ['涉及人数≥30，存在群体性风险'] : []),
        ...(dto.claimType === 'support_prosecution' ? ['申请支持起诉，需重点关注'] : []),
      ],
    };

    await this.prisma.clue.update({
      where: { id: clueId },
      data: { aiPreAnalysis: analysis as any, riskLevel: analysis.riskLevel, riskReason: analysis.riskReasons.join('; ') },
    });

    await this.prisma.clueFlowRecord.create({
      data: { clueId, node: 'ai_analysis', action: 'AI预分析完成', operatorName: 'AI系统', status: 'completed' },
    });
  }

  private async createKeyClueTask(clue: any) {
    const prosecutor = await this.prisma.user.findFirst({ where: { role: { code: 'prosecutor' } } });
    if (!prosecutor) return;

    await this.prisma.task.create({
      data: {
        type: 'clue_review',
        title: `【重点线索】需要支持起诉审查 - ${clue.clueNo}`,
        description: `申请人勾选了"需要支持起诉"，请及时处理`,
        bizId: clue.id,
        bizType: 'clue',
        assigneeId: prosecutor.id,
        assigneeName: prosecutor.realName,
        priority: clue.claimType === 'support_prosecution' ? 'high' : 'normal',
        dueDate: dayjs().add(3, 'day').toDate(),
      },
    });

    await this.prisma.notification.create({
      data: {
        userId: prosecutor.id,
        type: 'task',
        title: '新重点线索待处理',
        content: `线索 ${clue.clueNo} 需要支持起诉，请及时研判`,
        link: `/clue/${clue.id}`,
        priority: 'high',
      },
    });
  }

  private async createCaseFromClue(clue: any, handlerId: string, handlerName: string) {
    const caseNo = `AJ-${dayjs().format('YYYYMMDD')}-${uuidv4().substring(0, 4).toUpperCase()}`;
    return this.prisma.case.create({
      data: {
        caseNo,
        clueId: clue.id,
        title: `${clue.applicantName} 诉 ${clue.subjectName} 欠薪案`,
        description: clue.claimOriginal,
        applicantName: clue.applicantName,
        applicantIdNo: clue.applicantIdNo,
        applicantPhone: clue.phone,
        respondentName: clue.subjectName,
        respondentContact: clue.subjectContact,
        amount: clue.amount,
        personCount: clue.personCount,
        status: 'under_review',
        handlerId,
        handlerName,
        filedAt: new Date(),
      },
    });
  }

  private groupCluesByDimension(clues: any[], dimension: string): any[][] {
    const groups = new Map<string, any[]>();
    for (const clue of clues) {
      let key: string;
      switch (dimension) {
        case 'project': key = clue.projectName; break;
        case 'subject': case 'contractor': key = clue.subjectName; break;
        case 'area':
          const addr = clue.projectAddressStd as any;
          key = addr?.district || clue.projectAddress;
          break;
        default: key = clue.projectName;
      }
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(clue);
    }
    return Array.from(groups.values()).filter((g) => g.length >= 2);
  }
}
