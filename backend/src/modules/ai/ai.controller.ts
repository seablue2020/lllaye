import { Controller, Post, Body, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AiService, ClaimPolishingInput, AiReviewInput, DocumentGenerationInput } from './ai.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @Post('polish-claim')
  @ApiOperation({ summary: '诉求原文一键润色' })
  polishClaim(@Body() input: ClaimPolishingInput) {
    return this.aiService.polishClaim(input);
  }

  @Post('review')
  @ApiOperation({ summary: 'AI 案件审查' })
  reviewCase(@Body() input: AiReviewInput) {
    return this.aiService.reviewCase(input);
  }

  @Post('generate-document')
  @ApiOperation({ summary: 'AI 文书生成' })
  generateDocument(@Body() input: DocumentGenerationInput) {
    return this.aiService.generateDocument(input);
  }

  @Post('generate-report/:caseId')
  @ApiOperation({ summary: 'AI 生成初步分析报告' })
  generateReport(@Param('caseId', ParseUUIDPipe) caseId: string) {
    return this.aiService.generateInitialReport(caseId, {});
  }
}
