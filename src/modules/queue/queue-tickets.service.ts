import { Injectable } from '@nestjs/common';
import { QueueTicketStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import { ConflictAppError, NotFoundAppError } from '../../core/errors/app-error';
import { QueueTicketsRepository } from './queue-tickets.repository';
import {
  assertClinicInScope,
  QUEUE_CONTROL_ROLES,
  RECEPTION_ROLES,
  STAFF_QUEUE_ROLES,
} from './policies/queue-policies';
import { toQueueTicketResponse } from './queue-ticket-response.mapper';
import { estimateQueuePosition } from './queue-estimate.util';
import { CallNextRequest } from './dto/call-next.dto';
import { CompleteTicketRequest, TicketActionRequest } from './dto/ticket-action.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class QueueTicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tickets: QueueTicketsRepository,
    private readonly audit: AuditService,
  ) {}

  private async withEstimate(
    ticket: NonNullable<Awaited<ReturnType<QueueTicketsRepository['findById']>>>,
  ) {
    if (ticket.status !== 'waiting') {
      return toQueueTicketResponse(ticket, { peopleAhead: 0, estimatedWaitMinutes: 0 });
    }
    const ahead = await this.prisma.queueTicket.count({
      where: {
        organizationId: ticket.organizationId,
        clinicLocationId: ticket.clinicLocationId,
        department: ticket.department,
        status: { in: ['waiting', 'called', 'acknowledged', 'in_service'] },
        OR: [
          { issuedAt: { lt: ticket.issuedAt } },
          { issuedAt: ticket.issuedAt, id: { lt: ticket.id } },
        ],
      },
    });
    return toQueueTicketResponse(ticket, estimateQueuePosition(ahead));
  }

  async list(
    principal: AuthenticatedPrincipal,
    query: {
      clinicLocationId: string;
      department?: string;
      status?: QueueTicketStatus;
      serviceStation?: string;
    },
  ) {
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: query.clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }
    assertClinicInScope(principal, STAFF_QUEUE_ROLES, clinicLocation.organizationId);

    const rows = await this.tickets.list({
      organizationId: clinicLocation.organizationId,
      clinicLocationId: query.clinicLocationId,
      department: query.department,
      status: query.status,
      serviceStation: query.serviceStation,
    });
    const data = await Promise.all(rows.map((row) => this.withEstimate(row)));
    return { data, meta: {} };
  }

  async stations(principal: AuthenticatedPrincipal, clinicLocationId: string) {
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }
    assertClinicInScope(principal, STAFF_QUEUE_ROLES, clinicLocation.organizationId);
    const rows = await this.tickets.stationSummary(clinicLocation.organizationId, clinicLocationId);
    return { data: rows };
  }

  async callNext(principal: AuthenticatedPrincipal, dto: CallNextRequest, context: RequestContext) {
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: dto.clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }
    assertClinicInScope(principal, QUEUE_CONTROL_ROLES, clinicLocation.organizationId);

    const called = await this.prisma.$transaction(async (tx) => {
      const ticket = await this.tickets.callNext(
        tx,
        clinicLocation.organizationId,
        dto.clinicLocationId,
        dto.department,
      );
      if (!ticket) return null;
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'queue_ticket.called',
          resourceType: 'queue_ticket',
          resourceId: ticket.id,
          patientId: ticket.patientId,
          organizationId: clinicLocation.organizationId,
          clinicLocationId: dto.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return ticket;
    });

    if (!called) {
      throw new NotFoundAppError('No ticket is currently waiting in this department.');
    }
    return { data: toQueueTicketResponse(called, { peopleAhead: 0, estimatedWaitMinutes: 0 }) };
  }

  private async loadTicketInScope(principal: AuthenticatedPrincipal, ticketId: string) {
    const ticket = await this.tickets.findById(ticketId);
    if (!ticket) {
      throw new NotFoundAppError('Queue ticket not found.');
    }
    assertClinicInScope(principal, QUEUE_CONTROL_ROLES, ticket.organizationId);
    return ticket;
  }

  async acknowledge(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: TicketActionRequest,
    context: RequestContext,
  ) {
    return this.applyTransition(
      principal,
      ticketId,
      dto.version,
      ['called'],
      { status: 'acknowledged', acknowledgedAt: new Date() },
      'queue_ticket.acknowledged',
      context,
    );
  }

  async startService(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: TicketActionRequest,
    context: RequestContext,
  ) {
    return this.applyTransition(
      principal,
      ticketId,
      dto.version,
      ['acknowledged', 'called'],
      { status: 'in_service', serviceStartedAt: new Date() },
      'queue_ticket.service_started',
      context,
    );
  }

  async skip(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: TicketActionRequest,
    context: RequestContext,
  ) {
    return this.applyTransition(
      principal,
      ticketId,
      dto.version,
      ['waiting', 'called', 'acknowledged'],
      { status: 'skipped' },
      'queue_ticket.skipped',
      context,
    );
  }

  async complete(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: CompleteTicketRequest,
    context: RequestContext,
  ) {
    const ticket = await this.loadTicketInScope(principal, ticketId);
    if (ticket.status !== 'in_service') {
      throw new ConflictAppError('QUEUE_TICKET_NOT_WAITING', 'Ticket is not currently in service.');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.tickets.transition(tx, ticketId, dto.version, ['in_service'], {
        status: dto.nextStation ? 'routed' : 'completed',
        completedAt: new Date(),
        ...(dto.nextStation ? { nextStation: dto.nextStation } : {}),
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The ticket was modified by another request.',
        );
      }
      let nextTicket = null;
      if (dto.nextStation) {
        nextTicket = await this.tickets.create(tx, {
          organizationId: ticket.organizationId,
          clinicLocationId: ticket.clinicLocationId,
          appointmentId: ticket.appointmentId,
          patientId: ticket.patientId,
          encounterId: ticket.encounterId,
          number: ticket.number,
          department: ticket.department,
          serviceStation: dto.nextStation,
          waitingArea: ticket.waitingArea,
          priority: ticket.priority,
          status: 'waiting',
        });
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: dto.nextStation ? 'queue_ticket.routed' : 'queue_ticket.completed',
          resourceType: 'queue_ticket',
          resourceId: ticketId,
          patientId: ticket.patientId,
          organizationId: ticket.organizationId,
          clinicLocationId: ticket.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return nextTicket ?? (await tx.queueTicket.findUniqueOrThrow({ where: { id: ticketId } }));
    });

    return { data: await this.withEstimate(updated) };
  }

  private async applyTransition(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    expectedVersion: number,
    fromStatuses: QueueTicketStatus[],
    data: Parameters<QueueTicketsRepository['transition']>[4],
    action: string,
    context: RequestContext,
  ) {
    const ticket = await this.loadTicketInScope(principal, ticketId);
    if (!fromStatuses.includes(ticket.status)) {
      throw new ConflictAppError(
        'QUEUE_TICKET_NOT_WAITING',
        `Ticket is not in an expected state (current: ${ticket.status}).`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await this.tickets.transition(
        tx,
        ticketId,
        expectedVersion,
        fromStatuses,
        data,
      );
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The ticket was modified by another request.',
        );
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action,
          resourceType: 'queue_ticket',
          resourceId: ticketId,
          patientId: ticket.patientId,
          organizationId: ticket.organizationId,
          clinicLocationId: ticket.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.queueTicket.findUniqueOrThrow({ where: { id: ticketId } });
    });

    return { data: await this.withEstimate(updated) };
  }

  async receptionSummary(principal: AuthenticatedPrincipal, clinicLocationId: string) {
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }
    assertClinicInScope(principal, RECEPTION_ROLES, clinicLocation.organizationId);

    const [upcomingAppointments, waitingCount, inServiceCount] = await this.prisma.$transaction([
      this.prisma.appointment.count({
        where: { clinicLocationId, status: 'upcoming', startAt: { gte: new Date() } },
      }),
      this.prisma.queueTicket.count({ where: { clinicLocationId, status: 'waiting' } }),
      this.prisma.queueTicket.count({
        where: { clinicLocationId, status: { in: ['called', 'acknowledged', 'in_service'] } },
      }),
    ]);

    return { data: { upcomingAppointments, waitingCount, inServiceCount } };
  }
}
