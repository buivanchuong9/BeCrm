import { BadRequestException, Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/security/current-user.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../core/http/api-envelope.decorator';
import { AvailabilityQuery } from './dto/availability.query';
import { ListPractitionersQuery } from './dto/list-practitioners.query';
import { PractitionersService } from './practitioners.service';
import {
  PractitionerAvailabilityResponseDto,
  PractitionerResponseDto,
} from './dto/responses/practitioner-response.dto';

@ApiTags('practitioners')
@Controller({ path: 'practitioners', version: '1' })
export class PractitionersController {
  constructor(private readonly practitioners: PractitionersService) {}

  @ApiOkListEnvelope(PractitionerResponseDto)
  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListPractitionersQuery) {
    return this.practitioners.list(principal, query);
  }

  @ApiOkEnvelope(PractitionerAvailabilityResponseDto)
  @Get(':practitionerId/availability')
  availability(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('practitionerId', ParseUUIDPipe) practitionerId: string,
    @Query() query: AvailabilityQuery,
  ) {
    const clinicLocationId =
      query.clinicLocationId ??
      principal.memberships.find((m) => m.clinicLocationId)?.clinicLocationId;
    if (!clinicLocationId)
      throw new BadRequestException(
        'clinicLocationId is required when the account is not clinic-scoped.',
      );
    return this.practitioners.availability(principal, practitionerId, {
      ...query,
      clinicLocationId,
    });
  }
}

@ApiTags('doctors')
@Controller({ path: 'doctors', version: '1' })
export class DoctorsController {
  constructor(private readonly practitioners: PractitionersService) {}

  @Get()
  list(@CurrentUser() principal: AuthenticatedPrincipal, @Query() query: ListPractitionersQuery) {
    return this.practitioners.list(principal, query);
  }

  @Get(':doctorId/availability')
  availability(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query() query: AvailabilityQuery,
  ) {
    const clinicLocationId =
      query.clinicLocationId ??
      principal.memberships.find((m) => m.clinicLocationId)?.clinicLocationId;
    if (!clinicLocationId)
      throw new BadRequestException(
        'clinicLocationId is required when the account is not clinic-scoped.',
      );
    return this.practitioners.availability(principal, doctorId, { ...query, clinicLocationId });
  }
}
