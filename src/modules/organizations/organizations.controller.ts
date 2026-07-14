import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { ApiOkListEnvelope } from '../../common/http/api-envelope.decorator';
import { OrganizationsService } from './organizations.service';
import { OrganizationResponseDto } from './dto/organization-response.dto';

class ListOrganizationsQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() search?: string;
}

@ApiTags('organizations')
@Controller({ path: 'organizations', version: '1' })
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @ApiOkListEnvelope(OrganizationResponseDto)
  @Get()
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListOrganizationsQuery,
  ) {
    const page = await this.organizationsService.list(principal, query);
    return { data: page.data, meta: page.meta };
  }
}
