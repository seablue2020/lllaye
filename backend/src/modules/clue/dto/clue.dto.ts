import { IsString, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, Min, Max, MaxLength, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class CreateClueDto {
  @ApiProperty({ description: '申请人姓名' })
  @IsString()
  @MaxLength(100)
  applicantName: string;

  @ApiProperty({ description: '身份证号（加密存储）' })
  @IsString()
  @MaxLength(18)
  applicantIdNo: string;

  @ApiProperty({ description: '联系电话' })
  @IsString()
  @MaxLength(20)
  phone: string;

  @ApiProperty({ description: '涉事主体类型', enum: ['个人', '企业', '包工头'] })
  @IsEnum(['个人', '企业', '包工头'])
  subjectType: string;

  @ApiProperty({ description: '涉事主体名称' })
  @IsString()
  @MaxLength(200)
  subjectName: string;

  @ApiPropertyOptional({ description: '涉事主体证件号（企业信用代码或个人身份证）' })
  @IsOptional()
  @IsString()
  subjectIdNo?: string;

  @ApiPropertyOptional({ description: '涉事主体联系方式' })
  @IsOptional()
  @IsString()
  subjectContact?: string;

  @ApiProperty({ description: '项目/工地名称' })
  @IsString()
  @MaxLength(200)
  projectName: string;

  @ApiProperty({ description: '项目地址' })
  @IsString()
  @MaxLength(500)
  projectAddress: string;

  @ApiPropertyOptional({ description: '欠薪金额' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiProperty({ description: '涉及人数', default: 1 })
  @IsNumber()
  @Min(1)
  personCount: number;

  @ApiProperty({ description: '诉求类型', enum: ['support_prosecution', 'wage_complaint', 'legal_consult', 'other'] })
  @IsEnum(['support_prosecution', 'wage_complaint', 'legal_consult', 'other'])
  claimType: string;

  @ApiProperty({ description: '原始诉求内容' })
  @IsString()
  claimOriginal: string;

  @ApiProperty({ description: '线索来源', enum: ['frontend', 'hotline_12345', 'dept_share', 'unit_transfer'] })
  @IsEnum(['frontend', 'hotline_12345', 'dept_share', 'unit_transfer'])
  source: string;

  @ApiPropertyOptional({ description: '来源详细信息' })
  @IsOptional()
  @IsString()
  sourceDetail?: string;
}

export class ClueQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: '线索状态' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: '风险等级' })
  @IsOptional()
  @IsString()
  riskLevel?: string;

  @ApiPropertyOptional({ description: '案发区域' })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiPropertyOptional({ description: '开始日期' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: '结束日期' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: '关键词搜索' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ description: '是否重点线索' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isKey?: boolean;

  @ApiPropertyOptional({ description: '是否聚合线索' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isAggregated?: boolean;

  @ApiPropertyOptional({ description: '诉求类型' })
  @IsOptional()
  @IsString()
  claimType?: string;

  @ApiPropertyOptional({ description: '来源' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: '排序字段', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortField?: string;

  @ApiPropertyOptional({ description: '排序方向', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class ClueTriageDto {
  @ApiProperty({ description: '分流操作：accept-受理, reject-不予受理, transfer-移送, supplement-补充材料' })
  @IsEnum(['accept', 'reject', 'transfer', 'supplement'])
  action: string;

  @ApiPropertyOptional({ description: '分流意见' })
  @IsOptional()
  @IsString()
  opinion?: string;

  @ApiPropertyOptional({ description: '接收方ID（移送时使用）' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiPropertyOptional({ description: '不予受理原因' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class AggregateClueDto {
  @ApiProperty({ description: '聚合维度', enum: ['project', 'subject', 'contractor', 'area'] })
  @IsEnum(['project', 'subject', 'contractor', 'area'])
  dimension: string;

  @ApiPropertyOptional({ description: '地址匹配颗粒度', enum: ['province', 'city', 'district', 'street'] })
  @IsOptional()
  @IsEnum(['province', 'city', 'district', 'street'])
  addressGranularity?: string;

  @ApiPropertyOptional({ description: '语义相似度阈值 0-1', default: 0.85 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  similarityThreshold?: number;

  @ApiPropertyOptional({ description: '待聚合的线索ID列表' })
  @IsOptional()
  @IsArray()
  clueIds?: string[];
}

export class ClueTimelineResponseDto {
  @ApiProperty({ description: '线索编号' })
  clueNo: string;

  @ApiProperty({ description: '流程节点列表' })
  records: {
    node: string;
    action: string;
    operatorName: string;
    opinion: string;
    status: string;
    createdAt: string;
  }[];
}
