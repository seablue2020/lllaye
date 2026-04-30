import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CaseService } from './case.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('case')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('case')
export class CaseController {
  constructor(private caseService: CaseService) {}

  @Post()
  @ApiOperation({ summary: '创建案件' })
  create(@Body() body: any) {
    return this.caseService.create(body);
  }

  @Get('list')
  @ApiOperation({ summary: '案件列表（分页、筛选）' })
  findAll(
    @Query('page') page?: number,
    @Query('pageSize') pageSize?: number,
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.caseService.list({ page, pageSize, status, keyword });
  }

  @Get(':id')
  @ApiOperation({ summary: '案件详情' })
  findOne(@Param('id') id: string) {
    return this.caseService.findOne(id);
  }
}
