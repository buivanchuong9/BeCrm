import { Injectable } from '@nestjs/common';
import { AppointmentStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { AuditService } from '../../common/audit/audit.service';
import { OutboxService } from '../../common/outbox/outbox.service';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import {
  ConflictAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../common/errors/app-error';
import { toOffsetPage } from '../../common/pagination/pagination.util';
import { PatientsRepository } from '../patients/patients.repository';
import { EncountersRepository } from '../encounters/encounters.repository';
import { AppointmentsRepository } from './appointments.repository';
import { CheckInTokensRepository } from './check-in-tokens.repository';
import {
  resolveAppointmentListScope,
  assertCanBook,
  assertCanModify,
  assertCanMarkMissed,
  assertCanManageCheckInToken,
  assertCanRevokeCheckInToken,
} from './policies/appointment-policies';
import { toAppointmentResponse, toCheckInTokenIssuedResponse } from './appointment-response.mapper';
import { CreateAppointmentRequest } from './dto/create-appointment.dto';
import { CancelAppointmentRequest } from './dto/cancel-appointment.dto';
import { RescheduleAppointmentRequest } from './dto/reschedule-appointment.dto';
import { MarkMissedRequest } from './dto/mark-missed.dto';
import { RevokeCheckInTokenRequest } from './dto/revoke-check-in-token.dto';
import { PractitionersService } from '../practitioners/practitioners.service';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

// Check-in window: token becomes usable 2h before the slot and stays valid
// until 2h after it — docs/api.md UNKNOWN-6, a safe operational default, not
// a confirmed clinic policy.
const CHECK_IN_WINDOW_BEFORE_MS = 2 * 60 * 60 * 1000;
const CHECK_IN_WINDOW_AFTER_MS = 2 * 60 * 60 * 1000;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly appointments: AppointmentsRepository,
    private readonly checkInTokens: CheckInTokensRepository,
    private readonly patients: PatientsRepository,
    private readonly encounters: EncountersRepository,
    private readonly practitioners: PractitionersService,
    private readonly audit: AuditService,
    private readonly outbox: OutboxService,
  ) {}

  async list(
    principal: AuthenticatedPrincipal,
    query: {
      page: number;
      limit: number;
      status?: AppointmentStatus;
      doctorId?: string;
      dateFrom?: string;
      dateTo?: string;
      clinicLocationId?: string;
    },
  ) {
    const scope = resolveAppointmentListScope(principal);
    const dateFrom = query.dateFrom ? new Date(query.dateFrom) : undefined;
    const dateTo = query.dateTo ? new Date(query.dateTo) : undefined;

    if (scope.mode === 'patient') {
      const patient = await this.patients.findByUserId(principal.userId);
      if (!patient) {
        return { data: [], meta: { page: 1, limit: query.limit, total: 0, totalPages: 1 } };
      }
      const { rows, total } = await this.appointments.listForPatient(
        patient.id,
        { status: query.status, dateFrom, dateTo },
        query.page,
        query.limit,
      );
      const page = toOffsetPage(rows.map(toAppointmentResponse), total, query.page, query.limit);
      return { data: page.data, meta: page.meta };
    }

    if (scope.mode === 'doctor') {
      const { rows, total } = await this.appointments.listForDoctor(
        principal.userId,
        { status: query.status, dateFrom, dateTo },
        query.page,
        query.limit,
      );
      const page = toOffsetPage(rows.map(toAppointmentResponse), total, query.page, query.limit);
      return { data: page.data, meta: page.meta };
    }

    const { rows, total } = await this.appointments.listForOrganizations({
      organizationIds: scope.mode === 'organizations' ? scope.organizationIds : null,
      status: query.status,
      doctorId: query.doctorId,
      dateFrom,
      dateTo,
      page: query.page,
      limit: query.limit,
    });
    const page = toOffsetPage(rows.map(toAppointmentResponse), total, query.page, query.limit);
    return { data: page.data, meta: page.meta };
  }

  async getDetail(principal: AuthenticatedPrincipal, appointmentId: string) {
    const appointment = await this.appointments.findVisibleById(principal, appointmentId);
    if (!appointment) {
      throw new NotFoundAppError('Appointment not found.');
    }
    const encounter = await this.prisma.medicalEncounter.findUnique({
      where: { appointmentId },
      select: { id: true },
    });
    return { data: { ...toAppointmentResponse(appointment), encounterId: encounter?.id ?? null } };
  }

  private async resolvePatientUserId(patientId: string): Promise<string | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { userId: true },
    });
    return patient?.userId ?? null;
  }

  async book(
    principal: AuthenticatedPrincipal,
    dto: CreateAppointmentRequest,
    context: RequestContext,
  ) {
    assertCanBook(principal);
    const isPatientCaller = principal.memberships.some((m) => m.role === 'patient');

    const patient = isPatientCaller
      ? await this.patients.findByUserId(principal.userId)
      : dto.onBehalfOfPatientId
        ? await this.patients.findVisibleById(principal, dto.onBehalfOfPatientId)
        : null;
    if (!isPatientCaller && !dto.onBehalfOfPatientId) {
      throw new ValidationAppError(
        [{ field: 'onBehalfOfPatientId', code: 'VALIDATION_FAILED' }],
        'onBehalfOfPatientId is required when booking on behalf of a patient.',
      );
    }
    if (!patient) {
      throw new NotFoundAppError('Patient not found.');
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const {
        assignment,
        startsAt: startAt,
        endsAt: endAt,
      } = await this.practitioners.consumeSlot(tx, dto.slotId);
      if (assignment.organizationId !== patient.organizationId) {
        throw new NotFoundAppError('Appointment slot not found.');
      }
      const appointment = await this.appointments.create(tx, {
        organizationId: patient.organizationId,
        clinicLocationId: assignment.clinicLocationId,
        patientId: patient.id,
        doctorId: assignment.practitionerUserId,
        department: assignment.department.code,
        consultationType: dto.consultationType ?? null,
        mode: dto.mode,
        startAt,
        endAt,
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId: appointment.id,
          actorId: principal.userId,
          action: 'booked',
          toStatus: 'upcoming',
          startsAt: startAt,
          endsAt: endAt,
        },
      });

      const encounter = await this.encounters.create(tx, {
        organizationId: patient.organizationId,
        clinicLocationId: assignment.clinicLocationId,
        patientId: patient.id,
        appointmentId: appointment.id,
        type: dto.mode === 'video' ? 'remote' : 'standard',
        origin: 'appointment',
        status: 'registered',
        department: assignment.department.code,
      });
      await this.encounters.addEvent(tx, encounter.id, 'Created from appointment booking', 'info');

      const { record: tokenRecord, rawToken } = await this.checkInTokens.issue(tx, {
        appointmentId: appointment.id,
        patientId: patient.id,
        clinicLocationId: assignment.clinicLocationId,
        validFrom: new Date(startAt.getTime() - CHECK_IN_WINDOW_BEFORE_MS),
        expiresAt: new Date(startAt.getTime() + CHECK_IN_WINDOW_AFTER_MS),
      });

      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'appointment.booked',
          resourceType: 'appointment',
          resourceId: appointment.id,
          patientId: patient.id,
          organizationId: patient.organizationId,
          clinicLocationId: assignment.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      await this.outbox.write(tx, {
        aggregateType: 'appointment',
        aggregateId: appointment.id,
        eventType: 'appointment.booked',
        payload: { appointmentId: appointment.id, patientId: patient.id },
      });
      await this.outbox.write(tx, {
        aggregateType: 'appointment',
        aggregateId: appointment.id,
        eventType: 'appointment.qr_issued',
        payload: { appointmentId: appointment.id, patientId: patient.id },
      });

      return { appointment, encounter, tokenRecord, rawToken };
    });

    return {
      data: {
        ...toAppointmentResponse(created.appointment),
        encounterId: created.encounter.id,
        checkInToken: toCheckInTokenIssuedResponse(created.tokenRecord, created.rawToken),
      },
    };
  }

  private async assertModifiable(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
  ): Promise<{
    appointment: NonNullable<Awaited<ReturnType<AppointmentsRepository['findVisibleById']>>>;
    isPatientCaller: boolean;
  }> {
    const appointment = await this.appointments.findVisibleById(principal, appointmentId);
    if (!appointment) {
      throw new NotFoundAppError('Appointment not found.');
    }
    const patientUserId = await this.resolvePatientUserId(appointment.patientId);
    assertCanModify(principal, appointment, patientUserId);
    const isPatientCaller =
      patientUserId !== null &&
      patientUserId === principal.userId &&
      !principal.memberships.some((m) =>
        ['receptionist', 'medical_administrator', 'super_administrator'].includes(m.role),
      );
    if (isPatientCaller) {
      const encounter = await this.prisma.medicalEncounter.findUnique({
        where: { appointmentId },
        select: { status: true },
      });
      if (encounter && encounter.status !== 'registered') {
        throw new ConflictAppError(
          'APPOINTMENT_NOT_CANCELLABLE',
          'This visit has already progressed past check-in; please contact reception.',
        );
      }
    }
    return { appointment, isPatientCaller };
  }

  async cancel(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
    dto: CancelAppointmentRequest,
    context: RequestContext,
  ) {
    const { appointment } = await this.assertModifiable(principal, appointmentId);
    if (appointment.status !== 'upcoming') {
      throw new ConflictAppError(
        'APPOINTMENT_NOT_CANCELLABLE',
        'This appointment is not upcoming.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({
        where: { id: appointmentId, version: dto.version, status: 'upcoming' },
        data: { status: 'cancelled', cancelReason: dto.reason ?? null, version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The appointment was modified by another request.',
        );
      }
      await this.checkInTokens.revokeActive(tx, appointmentId, 'Appointment cancelled');
      await tx.appointmentHistory.create({
        data: {
          appointmentId,
          actorId: principal.userId,
          action: 'cancelled',
          fromStatus: appointment.status,
          toStatus: 'cancelled',
          startsAt: appointment.startAt,
          endsAt: appointment.endAt,
          reason: dto.reason ?? null,
        },
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'appointment.cancelled',
          resourceType: 'appointment',
          resourceId: appointmentId,
          patientId: appointment.patientId,
          organizationId: appointment.organizationId,
          reason: dto.reason ?? null,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      await this.outbox.write(tx, {
        aggregateType: 'appointment',
        aggregateId: appointmentId,
        eventType: 'appointment.cancelled',
        payload: { appointmentId, patientId: appointment.patientId, reason: dto.reason ?? null },
      });
      return tx.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
    });

    return { data: toAppointmentResponse(updated) };
  }

  async reschedule(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
    dto: RescheduleAppointmentRequest,
    context: RequestContext,
  ) {
    const { appointment } = await this.assertModifiable(principal, appointmentId);
    if (appointment.status !== 'upcoming') {
      throw new ConflictAppError(
        'APPOINTMENT_NOT_CANCELLABLE',
        'This appointment is not upcoming.',
      );
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      const {
        assignment,
        startsAt: newStartAt,
        endsAt: newEndAt,
      } = await this.practitioners.consumeSlot(tx, dto.slotId, appointmentId);
      if (
        assignment.organizationId !== appointment.organizationId ||
        assignment.clinicLocationId !== appointment.clinicLocationId ||
        assignment.practitionerUserId !== appointment.doctorId
      ) {
        throw new ConflictAppError(
          'APPOINTMENT_SLOT_UNAVAILABLE',
          'Rescheduling cannot change the appointment practitioner or clinic.',
        );
      }
      const result = await this.appointments.updateSlot(
        tx,
        appointmentId,
        dto.version,
        newStartAt,
        newEndAt,
      );
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The appointment was modified by another request.',
        );
      }
      const issuedToken = await this.checkInTokens.issue(tx, {
        appointmentId,
        patientId: appointment.patientId,
        clinicLocationId: appointment.clinicLocationId,
        validFrom: new Date(newStartAt.getTime() - CHECK_IN_WINDOW_BEFORE_MS),
        expiresAt: new Date(newStartAt.getTime() + CHECK_IN_WINDOW_AFTER_MS),
      });
      await tx.appointmentHistory.create({
        data: {
          appointmentId,
          actorId: principal.userId,
          action: 'rescheduled',
          fromStatus: appointment.status,
          toStatus: 'upcoming',
          startsAt: newStartAt,
          endsAt: newEndAt,
        },
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'appointment.rescheduled',
          resourceType: 'appointment',
          resourceId: appointmentId,
          patientId: appointment.patientId,
          organizationId: appointment.organizationId,
          changedFields: ['startAt', 'endAt'],
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      await this.outbox.write(tx, {
        aggregateType: 'appointment',
        aggregateId: appointmentId,
        eventType: 'appointment.rescheduled',
        payload: {
          appointmentId,
          patientId: appointment.patientId,
          startsAt: newStartAt.toISOString(),
          endsAt: newEndAt.toISOString(),
        },
      });
      const updatedAppointment = await tx.appointment.findUniqueOrThrow({
        where: { id: appointmentId },
      });
      return { updatedAppointment, issuedToken };
    });

    return {
      data: {
        ...toAppointmentResponse(updated.updatedAppointment),
        checkInToken: toCheckInTokenIssuedResponse(
          updated.issuedToken.record,
          updated.issuedToken.rawToken,
        ),
      },
    };
  }

  async markMissed(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
    dto: MarkMissedRequest,
    context: RequestContext,
  ) {
    const appointment = await this.appointments.findVisibleById(principal, appointmentId);
    if (!appointment) {
      throw new NotFoundAppError('Appointment not found.');
    }
    assertCanMarkMissed(principal, appointment);
    if (appointment.status !== 'upcoming') {
      throw new ConflictAppError(
        'APPOINTMENT_NOT_CANCELLABLE',
        'This appointment is not upcoming.',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.appointment.updateMany({
        where: { id: appointmentId, version: dto.version, status: 'upcoming' },
        data: { status: 'missed', version: { increment: 1 } },
      });
      if (result.count === 0) {
        throw new ConflictAppError(
          'OPTIMISTIC_LOCK_FAILED',
          'The appointment was modified by another request.',
        );
      }
      await tx.appointmentHistory.create({
        data: {
          appointmentId,
          actorId: principal.userId,
          action: 'missed',
          fromStatus: appointment.status,
          toStatus: 'missed',
          startsAt: appointment.startAt,
          endsAt: appointment.endAt,
        },
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'appointment.missed_marked',
          resourceType: 'appointment',
          resourceId: appointmentId,
          patientId: appointment.patientId,
          organizationId: appointment.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.appointment.findUniqueOrThrow({ where: { id: appointmentId } });
    });

    return { data: toAppointmentResponse(updated) };
  }

  async issueCheckInToken(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
    context: RequestContext,
  ) {
    const appointment = await this.appointments.findVisibleById(principal, appointmentId);
    if (!appointment) {
      throw new NotFoundAppError('Appointment not found.');
    }
    const patientUserId = await this.resolvePatientUserId(appointment.patientId);
    assertCanManageCheckInToken(principal, appointment, patientUserId);
    if (appointment.status !== 'upcoming') {
      throw new ConflictAppError(
        'APPOINTMENT_NOT_CANCELLABLE',
        'Cannot issue a check-in token for a non-upcoming appointment.',
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const issued = await this.checkInTokens.issue(tx, {
        appointmentId,
        patientId: appointment.patientId,
        clinicLocationId: appointment.clinicLocationId,
        validFrom: new Date(appointment.startAt.getTime() - CHECK_IN_WINDOW_BEFORE_MS),
        expiresAt: new Date(appointment.startAt.getTime() + CHECK_IN_WINDOW_AFTER_MS),
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'appointment.check_in_token.issued',
          resourceType: 'appointment_check_in_token',
          resourceId: issued.record.id,
          patientId: appointment.patientId,
          organizationId: appointment.organizationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return issued;
    });

    return { data: toCheckInTokenIssuedResponse(result.record, result.rawToken) };
  }

  async revokeCheckInToken(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
    dto: RevokeCheckInTokenRequest,
    context: RequestContext,
  ) {
    const appointment = await this.appointments.findVisibleById(principal, appointmentId);
    if (!appointment) {
      throw new NotFoundAppError('Appointment not found.');
    }
    assertCanRevokeCheckInToken(principal, appointment);

    await this.prisma.$transaction(async (tx) => {
      const result = await this.checkInTokens.revokeActive(tx, appointmentId, dto.reason);
      if (result.count === 0) {
        throw new NotFoundAppError('No active check-in token to revoke.');
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'appointment.check_in_token.revoked',
          resourceType: 'appointment_check_in_token',
          resourceId: appointmentId,
          patientId: appointment.patientId,
          organizationId: appointment.organizationId,
          reason: dto.reason,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
    });

    return { data: { revoked: true } };
  }
}
