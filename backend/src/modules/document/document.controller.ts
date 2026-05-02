import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('document')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentController {
  constructor(private documentService: DocumentService) {}

  @Get('templates')
  @ApiOperation({ summary: '获取文书模板库' })
  getTemplates(@Query('category') category?: string) {
    return this.documentService.getTemplates(category);
  }

  @Get()
  @ApiOperation({ summary: '文书列表' })
  findAll(@Query('caseId') caseId?: string) {
    return this.documentService.findAll(caseId);
  }

  @Get('grouped-by-case')
  @ApiOperation({ summary: '按案件分组的文书列表' })
  findGroupedByCase() {
    return this.documentService.findGroupedByCase();
  }

  @Get(':id')
  @ApiOperation({ summary: '文书详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.findOne(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: '文书版本历史' })
  getVersions(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentService.getVersions(id);
  }

  @Post('generate')
  @ApiOperation({ summary: 'AI 生成文书' })
  generate(
    @Body() body: { caseId: string; templateId?: string; docType?: string },
    @CurrentUser('sub') userId: string,
    @CurrentUser('realName') realName: string,
  ) {
    return this.documentService.generateDocument(body.caseId, userId, realName, {
      templateId: body.templateId,
      docType: body.docType,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: '编辑文书' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { content: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.documentService.updateDocument(id, body.content, userId);
  }

  @Post(':id/submit')
  @ApiOperation({ summary: '提交审批' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('realName') realName: string,
  ) {
    return this.documentService.submitForApproval(id, userId, realName);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: '审批通过' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { opinion: string; signatureUrl?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.documentService.approve(id, userId, body.opinion, body.signatureUrl);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: '审批拒绝' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { opinion: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.documentService.reject(id, userId, body.opinion);
  }

  @Post(':id/archive')
  @ApiOperation({ summary: '归档文书' })
  archive(@Param('id', ParseUUIDPipe) id: string, @CurrentUser('sub') userId: string) {
    return this.documentService.archive(id, userId);
  }
}
