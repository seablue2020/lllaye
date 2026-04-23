import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ClueService } from './clue.service';
import { CreateClueDto, ClueQueryDto, ClueTriageDto, AggregateClueDto } from './dto/clue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('clue')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('clues')
export class ClueController {
  constructor(private clueService: ClueService) {}

  @Post()
  @ApiOperation({ summary: '新增线索（摆渡接口）' })
  create(@Body() dto: CreateClueDto) {
    return this.clueService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: '线索列表（分页、筛选）' })
  findAll(@Query() query: ClueQueryDto) {
    return this.clueService.findAll(query);
  }

  @Get('heatmap')
  @ApiOperation({ summary: '线索分布热力图数据' })
  getHeatmap() {
    return this.clueService.getHeatmapData();
  }

  @Get('duplicates/:id')
  @ApiOperation({ summary: '重复诉求查询' })
  findDuplicates(@Param('id', ParseUUIDPipe) id: string) {
    return this.clueService.findDuplicates(id);
  }

  @Get(':id')
  @ApiOperation({ summary: '线索详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.clueService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: '线索流程时间轴' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string) {
    return this.clueService.getTimeline(id);
  }

  @Put(':id/triage')
  @ApiOperation({ summary: '线索分流处理' })
  triage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ClueTriageDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('realName') realName: string,
  ) {
    return this.clueService.triage(id, dto, userId, realName);
  }

  @Post('aggregate')
  @ApiOperation({ summary: '线索智能聚合' })
  aggregate(
    @Body() dto: AggregateClueDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('realName') realName: string,
  ) {
    return this.clueService.aggregate(dto, userId, realName);
  }
}
