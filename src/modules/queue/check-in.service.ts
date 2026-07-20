import { Injectable, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import {
  AppError,
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
} from '../../core/errors/app-error';
import { AppointmentsRepository } from '../appointments/appointments.repository';
import { CheckInTokensRepository, hashToken } from '../appointments/check-in-tokens.repository';
import { EncountersRepository } from '../encounters/encounters.repository';
import { KioskDevicesRepository, secretMatches } from './kiosk-devices.repository';
import { QueueTicketsRepository } from './queue-tickets.repository';
import { toQueueTicketResponse } from './queue-ticket-response.mapper';
import { estimateQueuePosition } from './queue-estimate.util';
import { CreateCheckInRequest } from './dto/create-check-in.dto';
import { CheckInResponseDto } from './dto/responses/check-in-response.dto';
import { OutboxService } from '../../core/outbox/outbox.service';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

function ticketPrefix(department: string): string {
  const first = department.trim().charAt(0).toUpperCase();
  return /^[A-Z]$/.test(first) ? first : 'Q';
}

@Injectable()
export class CheckInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kioskDevices: KioskDevicesRepository,
    private readonly checkInTokens: CheckInTokensRepository,
    private readonly appointments: AppointmentsRepository,
    private readonly encounters: EncountersRepository,
    private readonly queueTickets: QueueTicketsRepository,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  /**
   * docs/api.md section 21 APT-9 — mirrors the confirmed frontend
   * `checkInService.checkIn` business logic exactly, corrected for the
   * security gaps that evidence flags: server-random token (never a
   * client-side hash), a registered-device credential instead of a
   * client-generated deviceId, and no client-trusted `actorId`.
   */
  async checkIn(
    dto: CreateCheckInRequest,
    context: RequestContext,
  ): Promise<{ data: CheckInResponseDto }> {
    const device = await this.kioskDevices.findById(dto.deviceId);
    if (
      !device ||
      device.status !== 'active' ||
      device.clinicLocationId !== dto.clinicLocationId ||
      !secretMatches(device, dto.deviceSecret)
    ) {
      throw new ForbiddenAppError(
        'KIOSK_DEVICE_UNAUTHORIZED',
        'This device is not authorized to check in patients.',
      );
    }

    const tokenRecord = await this.checkInTokens.findByHash(hashToken(dto.token));
    if (!tokenRecord) {
      await this.audit.write({
        actorId: null,
        action: 'qr.validation_failed',
        resourceType: 'appointment_check_in_token',
        result: 'denied',
        reason: 'QR_INVALID: token not found',
        organizationId: device.organizationId,
        clinicLocationId: device.clinicLocationId,
        requestId: context.requestId ?? null,
        ip: context.ip ?? null,
        userAgent: context.userAgent ?? null,
      });
      throw new AppError(
        'QR_INVALID',
        'This check-in code is not valid.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // Idempotent rescan: a token already used with a still-live ticket for its
    // appointment replays that ticket instead of failing (docs/api.md section
    // 12/41 — a patient rescanning a physical QR code has no way to resend a
    // client-generated Idempotency-Key).
    if (tokenRecord.status === 'used') {
      const liveTicket = await this.queueTickets.findLiveByAppointmentId(tokenRecord.appointmentId);
      if (liveTicket) {
        await this.audit.write({
          actorId: null,
          action: 'qr.rescan_idempotent',
          resourceType: 'queue_ticket',
          resourceId: liveTicket.id,
          patientId: liveTicket.patientId,
          organizationId: liveTicket.organizationId,
          clinicLocationId: liveTicket.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        });
        return {
          data: { ticket: await this.withEstimate(liveTicket), repeated: true },
        };
      }
    }

    if (tokenRecord.status === 'revoked' || tokenRecord.status === 'replaced') {
      throw new AppError(
        'QR_REVOKED',
        'This check-in code has been revoked.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (tokenRecord.status !== 'active') {
      throw new AppError(
        'QR_INVALID',
        'This check-in code is not valid.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const appointment = await this.appointments.findById(tokenRecord.appointmentId);
    if (
      !appointment ||
      appointment.status !== 'upcoming' ||
      appointment.clinicLocationId !== dto.clinicLocationId ||
      appointment.clinicLocationId !== tokenRecord.clinicLocationId ||
      appointment.organizationId !== device.organizationId ||
      appointment.patientId !== tokenRecord.patientId
    ) {
      throw new AppError(
        'QR_INVALID',
        'This check-in code is not valid.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    if (dto.patientId && dto.patientId !== tokenRecord.patientId) {
      throw new AppError(
        'QR_INVALID',
        'This check-in code is not valid.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    const now = Date.now();
    if (now < tokenRecord.validFrom.getTime() || now > tokenRecord.expiresAt.getTime()) {
      throw new AppError(
        'QR_EXPIRED',
        'This check-in code has expired.',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const encounter = await this.prisma.medicalEncounter.findUnique({
      where: { appointmentId: appointment.id },
    });
    if (!encounter) {
      throw new NotFoundAppError('No encounter is linked to this appointment.');
    }

    const aheadCount = await this.queueTickets.countWaitingAhead(
      appointment.organizationId,
      appointment.clinicLocationId,
      appointment.department,
    );
    const estimate = estimateQueuePosition(aheadCount);

    try {
      const ticket = await this.prisma.$transaction(async (tx) => {
        const dayStart = new Date();
        dayStart.setUTCHours(0, 0, 0, 0);
        const issuedToday = await tx.queueTicket.count({
          where: {
            organizationId: appointment.organizationId,
            clinicLocationId: appointment.clinicLocationId,
            department: appointment.department,
            issuedAt: { gte: dayStart },
          },
        });
        const number = `${ticketPrefix(appointment.department)}${String(issuedToday + 1).padStart(3, '0')}`;

        const created = await this.queueTickets.create(tx, {
          organizationId: appointment.organizationId,
          clinicLocationId: appointment.clinicLocationId,
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          encounterId: encounter.id,
          number,
          department: appointment.department,
          // Phase 1 default: no separate station-routing configuration exists
          // yet (docs/api.md section 45) — service station and waiting area
          // default to the department name.
          serviceStation: appointment.department,
          waitingArea: appointment.department,
          priority: 'normal',
          status: 'waiting',
        });

        const markResult = await this.checkInTokens.markUsed(
          tx,
          tokenRecord.id,
          tokenRecord.version,
          device.id,
        );
        if (markResult.count === 0) {
          throw new ConflictAppError('QR_INVALID', 'This check-in code was already used.');
        }

        await tx.medicalEncounter.update({
          where: { id: encounter.id },
          data: {
            queueNumber: created.number,
            peopleAheadInQueue: estimate.peopleAhead,
            estimatedWaitMinutes: estimate.estimatedWaitMinutes,
            version: { increment: 1 },
          },
        });
        await this.encounters.addEvent(tx, encounter.id, 'Checked in via QR code', 'success');

        await this.audit.write(
          {
            actorId: null,
            actorRoleSnapshot: 'kiosk_device',
            action: 'qr.check_in.succeeded',
            resourceType: 'queue_ticket',
            resourceId: created.id,
            patientId: appointment.patientId,
            organizationId: appointment.organizationId,
            clinicLocationId: appointment.clinicLocationId,
            result: 'success',
            requestId: context.requestId ?? null,
            ip: context.ip ?? null,
            userAgent: context.userAgent ?? null,
          },
          tx,
        );
        await this.outbox.write(tx, {
          aggregateType: 'queue_ticket',
          aggregateId: created.id,
          eventType: 'queue.ticket_issued',
          payload: {
            queueTicketId: created.id,
            appointmentId: appointment.id,
            clinicLocationId: appointment.clinicLocationId,
          },
        });

        return created;
      });

      return { data: { ticket: toQueueTicketResponse(ticket, estimate), repeated: false } };
    } catch (err) {
      // docs/api.md section 41 "QR check-in": two truly concurrent redemptions
      // of the same never-yet-used token both pass every check above and race
      // to create the ticket — the partial unique index
      // uniq_queue_ticket_live_per_appointment lets exactly one win; the loser
      // replays the winner's ticket instead of erroring, same as a sequential
      // rescan.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const liveTicket = await this.queueTickets.findLiveByAppointmentId(
          tokenRecord.appointmentId,
        );
        if (liveTicket) {
          return { data: { ticket: await this.withEstimate(liveTicket), repeated: true } };
        }
      }
      throw err;
    }
  }

  private async withEstimate(
    ticket: NonNullable<Awaited<ReturnType<QueueTicketsRepository['findById']>>>,
  ) {
    const aheadCount = await this.queueTickets.countWaitingAhead(
      ticket.organizationId,
      ticket.clinicLocationId,
      ticket.department,
    );
    return toQueueTicketResponse(ticket, estimateQueuePosition(aheadCount));
  }
}
