import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BatchService {
  constructor(private prisma: PrismaService) {}

  async getAggregates() {
    const aggregates = await this.prisma.caseAggregate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        aggregateClues: {
          include: { clue: { select: { id: true, clueNo: true, status: true, riskLevel: true } } },
        },
      },
    });

    return aggregates.map((agg) => ({
      ...agg,
      clueDetails: agg.aggregateClues.map((ac) => ac.clue),
      totalClues: agg.aggregateClues.length,
      keyClues: agg.aggregateClues.filter((ac) => ac.clue.riskLevel === 'high').length,
    }));
  }

  async createAggregate(dto: { name: string; dimension: string; clueIds: string[] }, operatorId: string, operatorName: string) {
    if (dto.clueIds.length < 2) {
      throw new BadRequestException('聚合至少需要2条线索');
    }

    const clues = await this.prisma.clue.findMany({
      where: { id: { in: dto.clueIds } },
    });

    if (clues.length < 2) {
      throw new BadRequestException('未找到足够的线索');
    }

    const aggregate = await this.prisma.caseAggregate.create({
      data: {
        aggregateNo: `BA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        name: dto.name,
        aggregateType: dto.dimension,
        totalAmount: clues.reduce((sum, c) => sum + Number(c.amount || 0), 0),
        totalPersonCount: clues.reduce((sum, c) => sum + c.personCount, 0),
        clueCount: clues.length,
        createdBy: operatorId,
        createdByName: operatorName,
        aggregateClues: {
          create: clues.map((clue, index) => ({
            clueId: clue.id,
            similarityScore: 1.0,
            isRepresentative: index === 0,
            addedBy: operatorId,
          })),
        },
      },
      include: { aggregateClues: true },
    });

    // 更新线索的聚合标记
    await this.prisma.clue.updateMany({
      where: { id: { in: dto.clueIds } },
      data: { isAggregated: true, aggregateNo: aggregate.aggregateNo },
    });

    return aggregate;
  }

  async batchProcess(aggregateId: string, action: string, operatorId: string, operatorName: string) {
    const aggregate = await this.prisma.caseAggregate.findUnique({
      where: { id: aggregateId },
      include: { aggregateClues: true },
    });

    if (!aggregate) throw new NotFoundException('类案合集不存在');

    const clueIds = aggregate.aggregateClues.map((ac) => ac.clueId);

    switch (action) {
      case 'accept':
        // 批量受理
        await this.prisma.clue.updateMany({
          where: { id: { in: clueIds } },
          data: { status: 'under_review', handlerId: operatorId, handlerName: operatorName },
        });
        break;

      case 'reject':
        await this.prisma.clue.updateMany({
          where: { id: { in: clueIds } },
          data: { status: 'rejected' },
        });
        break;

      case 'triage':
        await this.prisma.clue.updateMany({
          where: { id: { in: clueIds } },
          data: { status: 'triaged', handlerId: operatorId, handlerName: operatorName },
        });
        break;

      default:
        throw new BadRequestException('无效的批量操作');
    }

    return { processed: clueIds.length, action };
  }

  async splitAggregate(aggregateId: string, clueIds: string[]) {
    if (clueIds.length === 0) throw new BadRequestException('请选择要拆分的线索');

    // 从合集中移除指定线索
    await this.prisma.aggregateClue.deleteMany({
      where: { aggregateId, clueId: { in: clueIds } },
    });

    // 更新线索的聚合标记
    await this.prisma.clue.updateMany({
      where: { id: { in: clueIds } },
      data: { isAggregated: false, aggregateNo: null },
    });

    return { removed: clueIds.length };
  }

  async closeAggregate(aggregateId: string) {
    return this.prisma.caseAggregate.update({
      where: { id: aggregateId },
      data: { status: 'closed', closedAt: new Date() },
    });
  }

  async getSimilarCases(projectName: string) {
    const cases = await this.prisma.case.findMany({
      where: {
        OR: [
          { title: { contains: projectName } },
          { description: { contains: projectName } },
        ],
      },
      select: {
        id: true,
        caseNo: true,
        title: true,
        status: true,
        amount: true,
        personCount: true,
        handlerName: true,
        closedAt: true,
      },
      take: 10,
    });

    return cases;
  }
}
