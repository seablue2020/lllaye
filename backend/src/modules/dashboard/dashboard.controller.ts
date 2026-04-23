import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: '获取核心办案指标' })
  getMetrics() {
    return this.dashboardService.getMetrics();
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取待办任务列表' })
  getTasks(@CurrentUser('sub') userId: string) {
    return this.dashboardService.getTasks(userId);
  }

  @Get('risk-warnings')
  @ApiOperation({ summary: '获取高风险涉稳线索预警' })
  getRiskWarnings() {
    return this.dashboardService.getRiskWarnings();
  }

  @Get('dynamics')
  @ApiOperation({ summary: '获取今日线索动态' })
  getTodayDynamics() {
    return this.dashboardService.getTodayDynamics();
  }
}
