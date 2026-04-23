import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { JwtAuthGuard, RolesGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('system')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('system')
export class SystemController {
  constructor(private systemService: SystemService) {}

  // 用户管理
  @Get('users')
  @ApiOperation({ summary: '用户列表' })
  getUsers(@Query() query: { page?: number; pageSize?: number; keyword?: string; roleId?: string }) {
    return this.systemService.getUsers(query);
  }

  @Post('users')
  @Roles('admin')
  @ApiOperation({ summary: '创建用户' })
  createUser(@Body() dto: any) {
    return this.systemService.createUser(dto);
  }

  @Put('users/:id')
  @Roles('admin')
  @ApiOperation({ summary: '更新用户' })
  updateUser(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.systemService.updateUser(id, dto);
  }

  @Delete('users/:id')
  @Roles('admin')
  @ApiOperation({ summary: '删除用户' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.systemService.deleteUser(id);
  }

  // 角色管理
  @Get('roles')
  @ApiOperation({ summary: '角色列表' })
  getRoles() {
    return this.systemService.getRoles();
  }

  @Post('roles')
  @Roles('admin')
  @ApiOperation({ summary: '创建角色' })
  createRole(@Body() dto: any) {
    return this.systemService.createRole(dto);
  }

  @Put('roles/:id')
  @Roles('admin')
  @ApiOperation({ summary: '更新角色' })
  updateRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.systemService.updateRole(id, dto);
  }

  // 机构管理
  @Get('orgs')
  @ApiOperation({ summary: '机构列表（树形）' })
  getOrgs() {
    return this.systemService.getOrgs();
  }

  // 字典管理
  @Get('dictionaries')
  @ApiOperation({ summary: '字典列表' })
  getDictionaries(@Query('type') type?: string) {
    return this.systemService.getDictionaries(type);
  }

  @Post('dictionaries')
  @Roles('admin')
  @ApiOperation({ summary: '创建字典' })
  createDictionary(@Body() dto: any) {
    return this.systemService.createDictionary(dto);
  }

  @Put('dictionaries/:id')
  @Roles('admin')
  @ApiOperation({ summary: '更新字典' })
  updateDictionary(@Param('id', ParseUUIDPipe) id: string, @Body() dto: any) {
    return this.systemService.updateDictionary(id, dto);
  }

  // 审计日志
  @Get('audit-logs')
  @ApiOperation({ summary: '审计日志' })
  getAuditLogs(@Query() query: any) {
    return this.systemService.getAuditLogs(query);
  }

  // 系统配置
  @Get('config')
  @ApiOperation({ summary: '系统配置' })
  getSystemConfig() {
    return this.systemService.getSystemConfig();
  }
}
