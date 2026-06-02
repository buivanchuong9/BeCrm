import { Controller, Get, Post, Delete, Body, Query, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ListUserDto, ResetPasswordDto, FcmDeviceDto } from './user.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { TenantId } from '../../../shared/decorators/tenant.decorator';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@ApiTags('auth')
@ApiBearerAuth('JWT')
@Controller()
export class UserController {
  constructor(private userService: UserService) {}

  @Post('authenticator/user/create')
  @ApiOperation({ summary: 'Create user' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: RequestUser) {
    return this.userService.create(dto, actor);
  }

  @Post('authenticator/user/admin_update')
  @ApiOperation({ summary: 'Admin update user' })
  adminUpdate(
    @Query('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.userService.adminUpdate(id, dto, actor);
  }

  @Get('authenticator/user/list')
  @ApiOperation({ summary: 'List users' })
  list(@Query() dto: ListUserDto, @TenantId() tenantId: string) {
    return this.userService.list(dto, tenantId);
  }

  @Get('authenticator/user/get')
  @ApiOperation({ summary: 'Get user by ID' })
  getById(@Query('id') id: string, @TenantId() tenantId: string) {
    return this.userService.getById(id, tenantId);
  }

  @Get('authenticator/user/basic_info')
  @ApiOperation({ summary: 'Get user basic info' })
  getBasicInfo(@Query('id') id: string) {
    return this.userService.getBasicInfo(id);
  }

  @Get('authenticator/user/select')
  @ApiOperation({ summary: 'Select users (autocomplete)' })
  selectUsers(@TenantId() tenantId: string, @Query('name') name?: string) {
    return this.userService.selectUsers(tenantId, name);
  }

  @Delete('authenticator/user/delete')
  @ApiOperation({ summary: 'Delete user' })
  delete(@Query('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.userService.delete(id, actor);
  }

  @Post('authenticator/user/reset_pass')
  @ApiOperation({ summary: 'Reset user password' })
  resetPassword(@Body() dto: ResetPasswordDto, @CurrentUser() actor: RequestUser) {
    return this.userService.resetPassword(dto, actor);
  }

  @Post('notification/fcmDevice/update')
  @ApiOperation({ summary: 'Register/update FCM device token' })
  upsertFcmDevice(@Body() dto: FcmDeviceDto, @CurrentUser() actor: RequestUser) {
    return this.userService.upsertFcmDevice(dto, actor);
  }
}
