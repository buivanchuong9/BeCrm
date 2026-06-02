import { Controller, Get, Post, Delete, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('catalog')
@ApiBearerAuth('JWT')
@Controller('adminapi')
export class CatalogController {
  constructor(private catalogService: CatalogService) {}

  // ── BeautyBranch ──────────────────────────────────────────────────────────

  @Get('beautyBranch/list')
  @ApiOperation({ summary: 'List beauty branches' })
  listBranches(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.catalogService.listBranches(tenantId, {
      parentId: query.parentId,
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Get('beautyBranch/child')
  @ApiOperation({ summary: 'List child branches' })
  listBranchChildren(@TenantId() tenantId: string, @Query('parentId') parentId: string) {
    return this.catalogService.listBranchChildren(tenantId, parentId);
  }

  @Get('beautyBranch/get')
  @ApiOperation({ summary: 'Get beauty branch detail' })
  getBranch(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.catalogService.getBranch(id, tenantId);
  }

  @Get('beautyBranch/get/byCode')
  @ApiOperation({ summary: 'Get beauty branch by code' })
  getBranchByCode(@Query('code') code: string, @TenantId() tenantId: string) {
    return this.catalogService.getBranchByCode(code, tenantId);
  }

  @Post('beautyBranch/update')
  @ApiOperation({ summary: 'Create or update beauty branch' })
  upsertBranch(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.catalogService.upsertBranch(body, actor);
  }

  @Delete('beautyBranch/delete')
  @ApiOperation({ summary: 'Delete beauty branch' })
  deleteBranch(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deleteBranch(id, actor);
  }

  @Post('beautyBranch/update/activate')
  @ApiOperation({ summary: 'Activate beauty branch' })
  activateBranch(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.activateBranch(id, actor);
  }

  @Post('beautyBranch/update/deactivate')
  @ApiOperation({ summary: 'Deactivate beauty branch' })
  deactivateBranch(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deactivateBranch(id, actor);
  }

  // ── Artifact / Common ─────────────────────────────────────────────────────

  @Get('common/list')
  @ApiOperation({ summary: 'List artifacts/common configs' })
  listArtifacts(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.catalogService.listArtifacts(tenantId, {
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('common/update')
  @ApiOperation({ summary: 'Create or update artifact/common config' })
  upsertArtifact(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.catalogService.upsertArtifact(body, actor);
  }

  @Delete('common/delete')
  @ApiOperation({ summary: 'Delete artifact/common config' })
  deleteArtifact(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deleteArtifact(id, actor);
  }

  // ── BrandName ─────────────────────────────────────────────────────────────

  @Get('brandname/list')
  @ApiOperation({ summary: 'List brand names' })
  listBrandNames(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.catalogService.listBrandNames(tenantId, {
      keyword: query.keyword,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('brandname/update')
  @ApiOperation({ summary: 'Create or update brand name' })
  upsertBrandName(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.catalogService.upsertBrandName(body, actor);
  }

  @Delete('brandname/delete')
  @ApiOperation({ summary: 'Delete brand name' })
  deleteBrandName(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deleteBrandName(id, actor);
  }

  @Get('whitelist/brandname/contact/list')
  @ApiOperation({ summary: 'List brand name whitelist' })
  listWhitelists(
    @TenantId() tenantId: string,
    @Query('brandNameId') brandNameId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.listWhitelists(tenantId, brandNameId, Number(page ?? 1), Number(limit ?? 20));
  }

  @Post('whitelist/brandname/contact/update')
  @ApiOperation({ summary: 'Add to brand name whitelist' })
  upsertWhitelist(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.catalogService.upsertWhitelist(body, actor);
  }

  @Delete('whitelist/brandname/contact/delete')
  @ApiOperation({ summary: 'Remove from brand name whitelist' })
  deleteWhitelist(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deleteWhitelist(id, actor);
  }

  @Post('whitelist/brandname/update')
  @ApiOperation({ summary: 'Update whitelist entry status' })
  updateWhitelistStatus(
    @Body() body: { id: string; isActive: boolean },
    @CurrentUser() actor: RequestUser,
  ) {
    return this.catalogService.updateWhitelistStatus(body.id, body.isActive, actor);
  }

  // ── ProjectType ───────────────────────────────────────────────────────────

  @Get('projectType/list')
  @ApiOperation({ summary: 'List project types' })
  listProjectTypes(@TenantId() tenantId: string, @Query('keyword') keyword?: string) {
    return this.catalogService.listProjectTypes(tenantId, { keyword });
  }

  @Post('projectType/update')
  @ApiOperation({ summary: 'Create or update project type' })
  upsertProjectType(@Body() body: Record<string, unknown>, @CurrentUser() actor: RequestUser) {
    return this.catalogService.upsertProjectType(body, actor);
  }

  @Delete('projectType/delete')
  @ApiOperation({ summary: 'Delete project type' })
  deleteProjectType(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deleteProjectType(id, actor);
  }
}

// ── Public API routes ─────────────────────────────────────────────────────────

import { Controller as C2 } from '@nestjs/common';

@ApiTags('catalog-public')
@Controller('api')
export class CatalogPublicController {
  constructor(private catalogService: CatalogService) {}

  @Get('area/child')
  @ApiOperation({ summary: 'Get area children' })
  listAreaChildren(
    @Query('parentId') parentId?: string,
    @Query('areaType') areaType?: string,
  ) {
    return this.catalogService.listAreaChildren(parentId, areaType);
  }

  @Get('beautySalon/list')
  @ApiOperation({ summary: 'List beauty salons' })
  listSalons(@TenantId() tenantId: string, @Query() query: Record<string, string>) {
    return this.catalogService.listSalons(tenantId, {
      keyword: query.keyword,
      status: query.status,
      page: query.page ? Number(query.page) : undefined,
      limit: query.limit ? Number(query.limit) : undefined,
    });
  }

  @Post('beautySalon/approve')
  @ApiOperation({ summary: 'Approve beauty salon' })
  approveSalon(@Body('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.approveSalon(id, actor);
  }

  @Delete('beautySalon/delete')
  @ApiOperation({ summary: 'Delete beauty salon' })
  deleteSalon(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.catalogService.deleteSalon(id, actor);
  }
}

// ── BPM common/get route ──────────────────────────────────────────────────────

import { Controller as C3 } from '@nestjs/common';

@ApiTags('bpm-common')
@ApiBearerAuth('JWT')
@C3('bpmapi')
export class BpmCommonController {
  constructor(private catalogService: CatalogService) {}

  @Get('common/get')
  @ApiOperation({ summary: 'Get artifact/common config by ID' })
  getArtifact(@Query('id') id: string) {
    return this.catalogService.getArtifact(id);
  }
}
