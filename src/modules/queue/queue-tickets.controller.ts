import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { QueueTicketStatus } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { ApiOkEnvelope, ApiOkListEnvelope } from '../../common/http/api-envelope.decorator';
import {
  QueueStationSummaryResponseDto,
  QueueTicketResponseDto,
  ReceptionSummaryResponseDto,
} from './dto/responses/queue-ticket-response.dto';
import { CallNextRequest } from './dto/call-next.dto';
import { CompleteTicketRequest, TicketActionRequest } from './dto/ticket-action.dto';
import { QueueTicketsService } from './queue-tickets.service';
import { from, interval, map, Observable, startWith, switchMap } from 'rxjs';

const STATUS_VALUES = [
  'waiting',
  'called',
  'acknowledged',
  'in_service',
  'skipped',
  'completed',
  'routed',
] as const;

class ListQueueTicketsQuery {
  @IsUUID() clinicLocationId!: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsIn(STATUS_VALUES) status?: QueueTicketStatus;
  @IsOptional() @IsString() serviceStation?: string;
}

function requestContext(req: Request) {
  return { requestId: req.requestId, ip: req.ip, userAgent: req.header('user-agent') };
}

@ApiTags('queue')
@Controller({ path: 'queue-tickets', version: '1' })
export class QueueTicketsController {
  constructor(private readonly queueTicketsService: QueueTicketsService) {}

  @ApiOkListEnvelope(QueueTicketResponseDto)
  @Get()
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query() query: ListQueueTicketsQuery,
  ) {
    return this.queueTicketsService.list(principal, query);
  }

  @ApiOkEnvelope(QueueTicketResponseDto)
  @Post('calls')
  @HttpCode(HttpStatus.OK)
  async callNext(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Body() dto: CallNextRequest,
    @Req() req: Request,
  ) {
    return this.queueTicketsService.callNext(principal, dto, requestContext(req));
  }

  @ApiOkEnvelope(QueueTicketResponseDto)
  @Post(':ticketId/acknowledgements')
  @HttpCode(HttpStatus.OK)
  async acknowledge(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: TicketActionRequest,
    @Req() req: Request,
  ) {
    return this.queueTicketsService.acknowledge(principal, ticketId, dto, requestContext(req));
  }

  @ApiOkEnvelope(QueueTicketResponseDto)
  @Post(':ticketId/service-starts')
  @HttpCode(HttpStatus.OK)
  async startService(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: TicketActionRequest,
    @Req() req: Request,
  ) {
    return this.queueTicketsService.startService(principal, ticketId, dto, requestContext(req));
  }

  @ApiOkEnvelope(QueueTicketResponseDto)
  @Post(':ticketId/skips')
  @HttpCode(HttpStatus.OK)
  async skip(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: TicketActionRequest,
    @Req() req: Request,
  ) {
    return this.queueTicketsService.skip(principal, ticketId, dto, requestContext(req));
  }

  @ApiOkEnvelope(QueueTicketResponseDto)
  @Post(':ticketId/completions')
  @HttpCode(HttpStatus.OK)
  async complete(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CompleteTicketRequest,
    @Req() req: Request,
  ) {
    return this.queueTicketsService.complete(principal, ticketId, dto, requestContext(req));
  }
}

@ApiTags('queue')
@Controller({ path: 'queue-stations', version: '1' })
export class QueueStationsController {
  constructor(private readonly queueTicketsService: QueueTicketsService) {}

  @ApiOkListEnvelope(QueueStationSummaryResponseDto)
  @Get()
  async list(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query('clinicLocationId', ParseUUIDPipe) clinicLocationId: string,
  ) {
    return this.queueTicketsService.stations(principal, clinicLocationId);
  }
}

@ApiTags('reception')
@Controller({ path: 'reception', version: '1' })
export class ReceptionController {
  constructor(private readonly queueTicketsService: QueueTicketsService) {}

  @ApiOkEnvelope(ReceptionSummaryResponseDto)
  @Get('summary')
  async summary(
    @CurrentUser() principal: AuthenticatedPrincipal,
    @Query('clinicLocationId', ParseUUIDPipe) clinicLocationId: string,
  ) {
    return this.queueTicketsService.receptionSummary(principal, clinicLocationId);
  }
}

@ApiTags('queue')
@Controller({ path: 'queue', version: '1' })
export class QueueContractController {
  constructor(private readonly service: QueueTicketsService) {}
  @Get() list(@CurrentUser() p: AuthenticatedPrincipal, @Query() q: ListQueueTicketsQuery) {
    return this.service.list(p, q);
  }
  @Sse('stream')
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'Queue snapshots as Server-Sent Events.',
    content: {
      'text/event-stream': {
        schema: { type: 'string', example: 'event: queue.snapshot\ndata: {...}\n\n' },
      },
    },
  })
  stream(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Query() q: ListQueueTicketsQuery,
  ): Observable<MessageEvent> {
    return interval(2_000).pipe(
      startWith(0),
      switchMap(() => from(this.service.list(p, q))),
      map((payload) => ({ type: 'queue.snapshot', data: payload })),
    );
  }
  @Get('stations') stations(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Query('clinicLocationId', ParseUUIDPipe) clinic: string,
  ) {
    return this.service.stations(p, clinic);
  }
  @Post('call-next') call(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Body() d: CallNextRequest,
    @Req() r: Request,
  ) {
    return this.service.callNext(p, d, requestContext(r));
  }
  @Post(':id/acknowledge') acknowledge(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TicketActionRequest,
    @Req() r: Request,
  ) {
    return this.service.acknowledge(p, id, d, requestContext(r));
  }
  @Post(':id/start-service') start(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TicketActionRequest,
    @Req() r: Request,
  ) {
    return this.service.startService(p, id, d, requestContext(r));
  }
  @Post(':id/skip') skip(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: TicketActionRequest,
    @Req() r: Request,
  ) {
    return this.service.skip(p, id, d, requestContext(r));
  }
  @Post(':id/complete') complete(
    @CurrentUser() p: AuthenticatedPrincipal,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() d: CompleteTicketRequest,
    @Req() r: Request,
  ) {
    return this.service.complete(p, id, d, requestContext(r));
  }
}
