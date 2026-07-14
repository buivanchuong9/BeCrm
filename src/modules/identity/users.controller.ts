import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRole, UserStatus } from '@prisma/client';
import { Roles } from '../../common/authorization/roles.decorator';
import { NotFoundAppError } from '../../common/errors/app-error';
import { toOffsetPage } from '../../common/pagination/pagination.util';
import { UsersRepository } from './users.repository';
import { toUserResponse } from './user-response.mapper';

class ListUsersQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsIn(Object.values(UserRole) as UserRole[]) role?: UserRole;
  @IsOptional()
  @IsIn(['pending_activation', 'active', 'suspended', 'deactivated'])
  status?: UserStatus;
}

/** Reference/admin user directory — `GET /users`, `GET /users/{userId}` per
 * docs/api.md section 25. Restricted to medical/system administrators. */
@ApiTags('users')
@Roles('medical_administrator', 'system_administrator')
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersRepository) {}

  @Get()
  async list(@Query() query: ListUsersQuery) {
    const { rows, total } = await this.users.list(query);
    const page = toOffsetPage(
      rows.map((u) => toUserResponse(u, this.users.toMembershipScopes(u))),
      total,
      query.page,
      query.limit,
    );
    return { data: page.data, meta: page.meta };
  }

  @Get(':userId')
  async detail(@Param('userId', ParseUUIDPipe) userId: string) {
    const user = await this.users.findByIdWithMemberships(userId);
    if (!user) {
      throw new NotFoundAppError('User not found.');
    }
    return { data: toUserResponse(user, this.users.toMembershipScopes(user)) };
  }
}
