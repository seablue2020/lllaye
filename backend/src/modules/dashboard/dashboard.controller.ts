import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get('metrics')
  @ApiOperation({ summary: '获取核心办案指标' })
  getMetrics(@CurrentUser('id') userId: string) {
    return this.dashboardService.getMetrics(userId);
  }

  @Get('tasks')
  @ApiOperation({ summary: '获取我的待办任务列表' })
  getTasks(@CurrentUser('id') userId: string) {
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
