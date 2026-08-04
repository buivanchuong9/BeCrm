import {
  Body,
  Controller,
  Get,
  Header,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../../common/authorization/roles.decorator';
import { RequireIdempotencyKey } from '../../core/idempotency/idempotency-key.decorator';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { CurrentUser } from '../../core/security/current-user.decorator';
import {
  CorrectLesionMaskRequest,
  CreateDermatologyAdverseEventRequest,
  CreateLesionComparisonRequest,
  CreateLesionObservationRequest,
  CreateLesionRequest,
  CreateLesionReviewRequest,
  LesionListQuery,
  LesionTimelineQuery,
} from './dto/lesion-tracking.dto';
import { LesionTrackingService } from './lesion-tracking.service';

const context = (request: Request) => ({
  requestId: request.requestId,
  ip: request.ip,
  userAgent: request.header('user-agent'),
});

@ApiTags('derma-timeline')
@ApiBearerAuth()
@Controller({ path: 'patients/:patientId', version: '1' })
export class PatientLesionsController {
  constructor(private readonly service: LesionTrackingService) {}

  @Get('lesions')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'List longitudinal lesions visible to the caller' })
  list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Query() query: LesionListQuery,
  ) {
    return this.service.listLesions(principal, patientId, query);
  }

  @Post('lesions')
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({ summary: 'Create a persistent lesion record' })
  create(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateLesionRequest,
    @Req() request: Request,
  ) {
    return this.service.createLesion(principal, patientId, dto, context(request));
  }

  @Post('adverse-events')
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({
    summary: 'Record a suspected dermatology adverse event; never creates an allergy',
  })
  createAdverseEvent(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: CreateDermatologyAdverseEventRequest,
    @Req() request: Request,
  ) {
    return this.service.createAdverseEvent(principal, patientId, dto, context(request));
  }
}

@ApiTags('derma-timeline')
@ApiBearerAuth()
@Controller({ path: 'lesions', version: '1' })
export class LesionsController {
  constructor(private readonly service: LesionTrackingService) {}

  @Get(':lesionId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get lesion observations, latest comparison, timeline and audit' })
  detail(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('lesionId', ParseUUIDPipe) lesionId: string,
  ) {
    return this.service.getLesion(principal, lesionId);
  }

  @Post(':lesionId/observations')
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({ summary: 'Create a draft observation from confirmed protected uploads' })
  createObservation(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('lesionId', ParseUUIDPipe) lesionId: string,
    @Body() dto: CreateLesionObservationRequest,
    @Req() request: Request,
  ) {
    return this.service.createObservation(principal, lesionId, dto, context(request));
  }

  @Post(':lesionId/comparisons')
  @HttpCode(HttpStatus.OK)
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({ summary: 'Create an idempotent comparison of two persisted observations' })
  createComparison(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('lesionId', ParseUUIDPipe) lesionId: string,
    @Body() dto: CreateLesionComparisonRequest,
    @Headers('idempotency-key') idempotencyKey: string,
    @Req() request: Request,
  ) {
    return this.service.createComparison(
      principal,
      lesionId,
      dto,
      idempotencyKey,
      context(request),
    );
  }

  @Get(':lesionId/timeline')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get cursor-paginated unified lesion timeline' })
  timeline(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('lesionId', ParseUUIDPipe) lesionId: string,
    @Query() query: LesionTimelineQuery,
  ) {
    return this.service.getTimeline(principal, lesionId, query);
  }
}

@ApiTags('derma-timeline')
@ApiBearerAuth()
@Controller({ path: 'observations', version: '1' })
export class LesionObservationsController {
  constructor(private readonly service: LesionTrackingService) {}

  @Post(':observationId/submit')
  @HttpCode(HttpStatus.OK)
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({ summary: 'Submit an observation without overwriting its original assets' })
  submit(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('observationId', ParseUUIDPipe) observationId: string,
    @Req() request: Request,
  ) {
    return this.service.submitObservation(principal, observationId, context(request));
  }
}

@ApiTags('derma-timeline')
@ApiBearerAuth()
@Controller({ path: 'comparisons', version: '1' })
export class LesionComparisonsController {
  constructor(private readonly service: LesionTrackingService) {}

  @Get(':comparisonId')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Get comparison processing status and immutable analysis result' })
  get(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('comparisonId', ParseUUIDPipe) comparisonId: string,
  ) {
    return this.service.getComparison(principal, comparisonId);
  }

  @Post(':comparisonId/reviews')
  @Roles('doctor')
  @HttpCode(HttpStatus.OK)
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({ summary: 'Append a scoped doctor review without replacing analysis output' })
  review(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('comparisonId', ParseUUIDPipe) comparisonId: string,
    @Body() dto: CreateLesionReviewRequest,
    @Req() request: Request,
  ) {
    return this.service.reviewComparison(principal, comparisonId, dto, context(request));
  }

  @Post(':comparisonId/masks/:assetId/corrections')
  @Roles('doctor')
  @HttpCode(HttpStatus.OK)
  @RequireIdempotencyKey({ clinical: true })
  @ApiOperation({
    summary:
      'Confirm or correct an AI-proposed mask; never mutates the original — always a new append-only row',
  })
  correctMask(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('comparisonId', ParseUUIDPipe) comparisonId: string,
    @Param('assetId', ParseUUIDPipe) assetId: string,
    @Body() dto: CorrectLesionMaskRequest,
    @Req() request: Request,
  ) {
    return this.service.correctMask(principal, comparisonId, assetId, dto, context(request));
  }
}
