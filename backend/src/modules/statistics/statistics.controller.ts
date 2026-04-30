import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StatisticsService } from './statistics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('statistics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('statistics')
export class StatisticsController {
  constructor(private statisticsService: StatisticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '综合统计报表' })
  getOverview(@Query() query: { startDate?: string; endDate?: string; orgId?: string }) {
    return this.statisticsService.getOverview(query);
  }

  @Get('region')
  @ApiOperation({ summary: '区域分布分析' })
  getRegionAnalysis(@Query() query: { startDate?: string; endDate?: string }) {
    return this.statisticsService.getRegionAnalysis(query);
  }

  @Get('quality')
  @ApiOperation({ summary: '办案质效分析' })
  getQualityAnalysis(@Query() query: { startDate?: string; endDate?: string }) {
    return this.statisticsService.getQualityAnalysis(query);
  }

  @Get('trend')
  @ApiOperation({ summary: '趋势数据' })
  getTrendData(query: { period?: 'day' | 'week' | 'month'; limit?: number }) {
    return this.statisticsService.getTrendData(query.period || 'day', query.limit || 30);
  }
}
