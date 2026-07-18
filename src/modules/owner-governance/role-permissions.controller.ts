import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { RequirePermission } from '../../common/authorization/require-permission.decorator';
import { PERMISSIONS, PERMISSION_CATALOG } from '../../common/authorization/permissions.catalog';
import { RolePermissionsService } from './role-permissions.service';
import { GrantRolePermissionRequest } from './dto/owner-governance.dto';

@ApiTags('owner-role-permissions')
@Controller({ path: 'owner/role-permissions', version: '1' })
export class RolePermissionsController {
  constructor(private readonly rolePermissions: RolePermissionsService) {}

  @RequirePermission(PERMISSIONS.USER_ROLE_ASSIGN)
  @Get()
  async list() {
    return { data: await this.rolePermissions.list() };
  }

  @RequirePermission(PERMISSIONS.USER_ROLE_ASSIGN)
  @Get('catalog')
  listCatalog() {
    return { data: PERMISSION_CATALOG };
  }

  @RequirePermission(PERMISSIONS.USER_ROLE_ASSIGN)
  @Post()
  async grant(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: GrantRolePermissionRequest,
    @Req() req: Request,
  ) {
    const row = await this.rolePermissions.grant(
      dto.role as UserRole,
      dto.permissionCode,
      principal.userId,
      {
        requestId: req.requestId,
        ip: req.ip,
        userAgent: req.header('user-agent'),
      },
    );
    return { data: row };
  }

  @RequirePermission(PERMISSIONS.USER_ROLE_ASSIGN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':role/:permissionCode')
  async revoke(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('role') role: string,
    @Param('permissionCode') permissionCode: string,
    @Req() req: Request,
  ): Promise<void> {
    await this.rolePermissions.revoke(role as UserRole, permissionCode, principal.userId, {
      requestId: req.requestId,
      ip: req.ip,
      userAgent: req.header('user-agent'),
    });
  }
}
