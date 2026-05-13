import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BatchService } from './batch.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('batch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('batch')
export class BatchController {
  constructor(private batchService: BatchService) {}

  @Get('aggregates')
  @ApiOperation({ summary: '类案合集列表' })
  getAggregates() {
    return this.batchService.getAggregates();
  }

  @Get(':id')
  @ApiOperation({ summary: '合集详情' })
  getAggregateDetail(@Param('id') id: string) {
    return this.batchService.getAggregateDetail(id);
  }

  @Post('aggregate')
  @ApiOperation({ summary: '新建类案合集' })
  createAggregate(
    @Body() body: { name: string; dimension: string; clueIds: string[] },
    @CurrentUser('id') userId: string,
    @CurrentUser('realName') realName: string,
  ) {
    return this.batchService.createAggregate(body, userId, realName);
  }

  @Post(':id/process')
  @ApiOperation({ summary: '批量处理' })
  batchProcess(
    @Param('id') id: string,
    @Body() body: { action: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('realName') realName: string,
  ) {
    return this.batchService.batchProcess(id, body.action, userId, realName);
  }

  @Put(':id/split')
  @ApiOperation({ summary: '拆分合集' })
  splitAggregate(@Param('id') id: string, @Body() body: { clueIds: string[] }) {
    return this.batchService.splitAggregate(id, body.clueIds);
  }

  @Put(':id/close')
  @ApiOperation({ summary: '关闭合集' })
  closeAggregate(@Param('id') id: string) {
    return this.batchService.closeAggregate(id);
  }

  @Get('similar/:projectName')
  @ApiOperation({ summary: '获取相似案例' })
  getSimilarCases(@Param('projectName') projectName: string) {
    return this.batchService.getSimilarCases(decodeURIComponent(projectName));
  }
}
