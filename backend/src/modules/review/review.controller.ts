import { Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('review')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reviews')
export class ReviewController {
  constructor(private reviewService: ReviewService) {}

  @Post(':clueId/start')
  @ApiOperation({ summary: '启动 AI 审查' })
  startReview(
    @Param('clueId', ParseUUIDPipe) clueId: string,
  ) {
    return this.reviewService.startReview(clueId);
  }

  @Get(':caseId/results')
  @ApiOperation({ summary: '获取审查结果列表' })
  getReviewResults(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.reviewService.getReviewResults(caseId);
  }

  @Post(':caseId/confirm')
  @ApiOperation({ summary: '确认审查意见' })
  confirmReview(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser('sub') userId: string,
    @Body() body: { dimension?: string },
  ) {
    return this.reviewService.confirmReview(caseId, userId, body.dimension);
  }

  @Post('results/:reviewId/reject')
  @ApiOperation({ summary: '驳回审查意见' })
  rejectReview(
    @Param('reviewId', ParseUUIDPipe) reviewId: string,
    @Body() body: { reason: string },
  ) {
    return this.reviewService.rejectReview(reviewId, body.reason);
  }

  @Get(':caseId/report')
  @ApiOperation({ summary: '获取初步分析报告' })
  getReport(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.reviewService.generateReport(caseId);
  }

  @Get(':caseId/guidance')
  @ApiOperation({ summary: '获取履职办案指引' })
  getGuidance(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.reviewService.getGuidance(caseId);
  }

  @Post('evidence/:evidenceId/review')
  @ApiOperation({ summary: '审查证据' })
  reviewEvidence(@Param('evidenceId', ParseUUIDPipe) evidenceId: string) {
    return this.reviewService.reviewEvidence(evidenceId);
  }
}
