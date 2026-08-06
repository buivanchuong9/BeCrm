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
import { allocateQueueNumber } from './queue-number-allocator';
import { toClinicDate } from './clinic-date.util';
import { CallNextRequest } from './dto/call-next.dto';
import { CompleteTicketRequest, TicketActionRequest } from './dto/ticket-action.dto';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

/** Maps service codes to department/station/prefix configuration. */
const SERVICE_MAP: Record<string, { department: string; station: string; prefix: string }> = {
  DERMATOLOGY: { department: 'Khoa Da liễu', station: 'Tiếp nhận Da liễu', prefix: 'D' },
  GENERAL: { department: 'Khám tổng quát', station: 'Quầy tiếp nhận', prefix: 'A' },
  VITALS: { department: 'Điều dưỡng', station: 'Khu đo sinh hiệu', prefix: 'S' },
};

const DEFAULT_SERVICE = SERVICE_MAP.DERMATOLOGY;
const FALLBACK_TZ = 'Asia/Ho_Chi_Minh';

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
    // Use the stored clinicDate (already timezone-correct when it was created)
    // rather than recomputing now() so cross-midnight reads stay accurate.
    const ahead = await this.prisma.queueTicket.count({
      where: {
        organizationId: ticket.organizationId,
        clinicLocationId: ticket.clinicLocationId,
        clinicDate: ticket.clinicDate,
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
      clinicLocationId?: string;
      clinicDate?: string;
      department?: string;
      status?: QueueTicketStatus;
      serviceStation?: string;
    },
  ) {
    if (!query.clinicLocationId) {
      return { data: [], meta: {} };
    }
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: query.clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }
    assertClinicInScope(principal, STAFF_QUEUE_ROLES, clinicLocation.organizationId);

    const tz = clinicLocation.timezone || FALLBACK_TZ;
    // When query.clinicDate is provided (ISO date string like "2026-08-06"),
    // treat it as a calendar date in the clinic timezone (clients always send
    // the local date they intend).  new Date("2026-08-06") = midnight UTC for
    // that date, which Prisma serialises to the DATE "2026-08-06" — correct.
    // When not provided, compute today's calendar date in the clinic timezone.
    const clinicDate = query.clinicDate ? new Date(query.clinicDate) : toClinicDate(tz);

    const rows = await this.tickets.list({
      organizationId: clinicLocation.organizationId,
      clinicLocationId: query.clinicLocationId,
      clinicDate,
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

    const tz = clinicLocation.timezone || FALLBACK_TZ;
    const clinicDate = toClinicDate(tz);

    const rows = await this.tickets.stationSummary(
      clinicLocation.organizationId,
      clinicLocationId,
      clinicDate,
    );
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

    const tz = clinicLocation.timezone || FALLBACK_TZ;
    const clinicDate = toClinicDate(tz);

    const called = await this.prisma.$transaction(async (tx) => {
      const ticket = await this.tickets.callNext(
        tx,
        clinicLocation.organizationId,
        dto.clinicLocationId,
        clinicDate,
        dto.department ?? null,
        principal.userId,
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
      { status: 'skipped', skippedAt: new Date() },
      'queue_ticket.skipped',
      context,
    );
  }

  async returnToQueue(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: TicketActionRequest,
    context: RequestContext,
  ) {
    return this.applyTransition(
      principal,
      ticketId,
      dto.version,
      ['skipped'],
      { status: 'waiting', skippedAt: null },
      'queue_ticket.returned_to_queue',
      context,
    );
  }

  async cancel(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: TicketActionRequest,
    context: RequestContext,
  ) {
    return this.applyTransition(
      principal,
      ticketId,
      dto.version,
      ['waiting', 'called', 'acknowledged', 'skipped'],
      { status: 'cancelled', cancelledAt: new Date() },
      'queue_ticket.cancelled',
      context,
    );
  }

  async noShow(
    principal: AuthenticatedPrincipal,
    ticketId: string,
    dto: TicketActionRequest,
    context: RequestContext,
  ) {
    return this.applyTransition(
      principal,
      ticketId,
      dto.version,
      ['called', 'acknowledged'],
      { status: 'no_show', noShowAt: new Date() },
      'queue_ticket.no_show',
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
          sourceType: ticket.sourceType,
          clinicDate: ticket.clinicDate,
          seqNumber: ticket.seqNumber,
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

    const tz = clinicLocation.timezone || FALLBACK_TZ;
    const clinicDate = toClinicDate(tz);

    const [upcomingAppointments, waitingCount, inServiceCount] = await this.prisma.$transaction([
      this.prisma.appointment.count({
        where: { clinicLocationId, status: 'upcoming', startAt: { gte: new Date() } },
      }),
      this.prisma.queueTicket.count({
        where: { clinicLocationId, clinicDate, status: 'waiting' },
      }),
      this.prisma.queueTicket.count({
        where: {
          clinicLocationId,
          clinicDate,
          status: { in: ['called', 'acknowledged', 'in_service'] },
        },
      }),
    ]);

    return { data: { upcomingAppointments, waitingCount, inServiceCount } };
  }

  /**
   * Walk-in registration: creates a queue entry WITHOUT a fake appointment.
   * sourceType = 'walk_in'.  clinicDate is derived from the clinic timezone.
   */
  async createWalkIn(dto: {
    clinicLocationId: string;
    serviceCode: string;
    fullName: string;
    phone: string;
    note?: string;
  }) {
    const clinicLocation = await this.prisma.clinicLocation.findUnique({
      where: { id: dto.clinicLocationId },
    });
    if (!clinicLocation) {
      throw new NotFoundAppError('Clinic location not found.');
    }

    const targetService = SERVICE_MAP[dto.serviceCode] ?? DEFAULT_SERVICE;
    const tz = clinicLocation.timezone || FALLBACK_TZ;
    const clinicDate = toClinicDate(tz);

    const ticket = await this.prisma.$transaction(async (tx) => {
      let patient = await tx.patient.findFirst({
        where: { organizationId: clinicLocation.organizationId, phone: dto.phone },
      });

      if (!patient) {
        const code = `WALK-${Date.now().toString().slice(-6)}`;
        patient = await tx.patient.create({
          data: {
            organizationId: clinicLocation.organizationId,
            code,
            name: dto.fullName,
            phone: dto.phone,
            dob: new Date('1995-01-01'),
            gender: 'unknown',
          },
        });
      }

      const encounter = await tx.medicalEncounter.create({
        data: {
          organizationId: clinicLocation.organizationId,
          clinicLocationId: dto.clinicLocationId,
          patientId: patient.id,
          type: 'standard',
          origin: 'walk_in',
          department: targetService.department,
          status: 'in_progress',
        },
      });

      const { seqNumber, displayCode } = await allocateQueueNumber(tx, {
        organizationId: clinicLocation.organizationId,
        clinicLocationId: dto.clinicLocationId,
        clinicDate,
        department: targetService.department,
        prefix: targetService.prefix,
      });

      const created = await this.tickets.create(tx, {
        organizationId: clinicLocation.organizationId,
        clinicLocationId: dto.clinicLocationId,
        patientId: patient.id,
        encounterId: encounter.id,
        sourceType: 'walk_in',
        clinicDate,
        seqNumber,
        number: displayCode,
        department: targetService.department,
        serviceStation: targetService.station,
        waitingArea: 'Sảnh chờ tầng 1',
        priority: 'normal',
        status: 'waiting',
      });

      return created;
    });

    return { data: await this.withEstimate(ticket) };
  }
}
