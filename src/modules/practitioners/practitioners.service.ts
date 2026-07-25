import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import {
  ConflictAppError,
  ForbiddenAppError,
  NotFoundAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { PrismaService } from '../../core/database/prisma.service';
import { AuditService } from '../../core/audit/audit.service';
import { AppConfiguration } from '../../core/configuration/configuration';
import { AvailabilityQuery } from './dto/availability.query';
import { ListPractitionersQuery } from './dto/list-practitioners.query';
import { ReplaceWeeklyScheduleRequest } from './dto/replace-weekly-schedule.dto';
import { CreateScheduleExceptionRequest } from './dto/create-schedule-exception.dto';
import { clinicLocalMinuteToUtc, weekdayForDate } from './timezone.util';
import {
  issueSlotReference,
  SlotReferencePayload,
  verifySlotReference,
} from './slot-reference.util';
import { assertCanManageSchedule } from './policies/practitioner-policies';
import {
  toPractitionerScheduleResponse,
  toScheduleExceptionResponse,
} from './practitioner-schedule.mapper';

export interface RequestContext {
  requestId?: string;
  ip?: string;
  userAgent?: string;
}

type DbClient = Prisma.TransactionClient | PrismaService;

type SlotStatus = 'AVAILABLE' | 'FULL' | 'BLOCKED' | 'BREAK' | 'PAST';
type UnavailableReasonCode =
  'CAPACITY_REACHED' | 'SCHEDULE_BLOCKED' | 'BREAK_TIME' | 'SLOT_IN_PAST';

interface UnavailableReason {
  code: UnavailableReasonCode;
  display: string;
}

interface GeneratedSlot {
  slotId: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  bookedCount: number;
  remainingCapacity: number;
  status: SlotStatus;
  selectable: boolean;
  unavailableReason: UnavailableReason | null;
}

interface ScheduleBreak {
  startsAt: string;
  endsAt: string;
  reasonCode: 'BREAK_TIME' | 'SCHEDULE_BLOCKED';
}

interface ScheduleSummary {
  startsAt: string;
  endsAt: string;
  breaks: ScheduleBreak[];
}

interface GenerateSlotsResult {
  slots: GeneratedSlot[];
  workingDay: boolean;
  schedule: ScheduleSummary | null;
}

const UNAVAILABLE_REASON_DISPLAY: Record<UnavailableReasonCode, string> = {
  CAPACITY_REACHED: 'Khung giờ đã kín',
  SCHEDULE_BLOCKED: 'Khung giờ đã bị khóa',
  BREAK_TIME: 'Giờ nghỉ',
  SLOT_IN_PAST: 'Khung giờ đã qua',
};

const NEXT_AVAILABLE_MAX_DATES = 5;
const NEXT_AVAILABLE_MAX_LOOKAHEAD_DAYS = 14;

type AssignmentForSlots = {
  id: string;
  version: number;
  practitionerUserId: string;
  organizationId: string;
  clinicLocationId: string;
  departmentId: string;
  slotDurationMinutes: number;
  capacity: number;
  clinicLocation: { timezone: string };
};

function organizationScope(principal: AuthenticatedPrincipal): string[] | null {
  if (principal.memberships.some((membership) => membership.role === 'super_administrator'))
    return null;
  return [...new Set(principal.memberships.map((membership) => membership.organizationId))];
}

function overlaps(startsAt: Date, endsAt: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return startsAt < rangeEnd && endsAt > rangeStart;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

@Injectable()
export class PractitionersService {
  private readonly slotSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    config: ConfigService<AppConfiguration, true>,
  ) {
    this.slotSecret = config.get('auth', { infer: true }).fieldEncryptionKey;
  }

  async list(principal: AuthenticatedPrincipal, query: ListPractitionersQuery) {
    const scope = organizationScope(principal);
    if (scope?.length === 0)
      return { data: [], meta: { page: query.page, limit: query.limit, total: 0, totalPages: 1 } };

    const where: Prisma.PractitionerProfileWhereInput = {
      ...(query.activeOnly ? { status: 'active', user: { status: 'active' } } : {}),
      clinicAssignments: {
        some: {
          active: true,
          ...(scope ? { organizationId: { in: scope } } : {}),
          ...(query.clinicLocationId ? { clinicLocationId: query.clinicLocationId } : {}),
        },
      },
      ...(query.specialtyId ? { specialties: { some: { specialtyId: query.specialtyId } } } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.practitionerProfile.findMany({
        where,
        include: {
          user: { select: { displayName: true, avatarFileId: true } },
          specialties: { include: { specialty: true }, orderBy: { primary: 'desc' } },
          clinicAssignments: {
            where: {
              active: true,
              ...(scope ? { organizationId: { in: scope } } : {}),
              ...(query.clinicLocationId ? { clinicLocationId: query.clinicLocationId } : {}),
            },
            include: { clinicLocation: true, department: true },
          },
        },
        orderBy: { user: { displayName: 'asc' } },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.practitionerProfile.count({ where }),
    ]);

    return {
      data: rows.map((row) => ({
        id: row.userId,
        displayName: row.user.displayName,
        avatarFileId: row.user.avatarFileId,
        title: row.title,
        bio: row.bio,
        status: row.status,
        specialties: row.specialties.map(({ specialty, primary }) => ({
          id: specialty.id,
          code: specialty.code,
          name: specialty.name,
          primary,
        })),
        clinicAssignments: row.clinicAssignments.map((assignment) => ({
          clinicLocationId: assignment.clinicLocationId,
          clinicName: assignment.clinicLocation.name,
          departmentId: assignment.departmentId,
          departmentCode: assignment.department.code,
          departmentName: assignment.department.name,
          slotDurationMinutes: assignment.slotDurationMinutes,
          capacity: assignment.capacity,
        })),
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async availability(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    query: AvailabilityQuery & { clinicLocationId: string },
  ) {
    const scope = organizationScope(principal);
    const assignment = await this.prisma.practitionerClinicAssignment.findFirst({
      where: {
        practitionerUserId: practitionerId,
        clinicLocationId: query.clinicLocationId,
        active: true,
        practitioner: { status: 'active', user: { status: 'active' } },
        clinicLocation: { status: 'active' },
        ...(scope ? { organizationId: { in: scope } } : {}),
      },
      include: { clinicLocation: true, department: true },
    });
    if (!assignment) {
      if (scope && !scope.length) throw new ForbiddenAppError('CLINIC_SCOPE_DENIED');
      return {
        data: {
          practitionerId,
          clinicLocationId: query.clinicLocationId,
          date: query.date,
          timezone: null,
          workingDay: false,
          slotDurationMinutes: null,
          capacity: null,
          defaultCapacity: null,
          schedule: null,
          slots: [],
          nextAvailableDates: [],
          generatedAt: new Date().toISOString(),
        },
      };
    }

    const { slots, workingDay, schedule } = await this.generateSlots(
      this.prisma,
      assignment,
      query.date,
      { includeUnavailable: query.includeUnavailable },
    );
    const nextAvailableDates = await this.computeNextAvailableDates(
      this.prisma,
      assignment,
      query.date,
    );
    return {
      data: {
        practitionerId,
        clinicLocationId: assignment.clinicLocationId,
        timezone: assignment.clinicLocation.timezone,
        date: query.date,
        workingDay,
        slotDurationMinutes: assignment.slotDurationMinutes,
        capacity: assignment.capacity,
        defaultCapacity: assignment.capacity,
        schedule,
        slots,
        nextAvailableDates,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  private async computeNextAvailableDates(
    db: DbClient,
    assignment: AssignmentForSlots,
    fromDate: string,
  ) {
    const results: { date: string; availableSlotCount: number; firstAvailableAt: string }[] = [];
    for (
      let offset = 1;
      offset <= NEXT_AVAILABLE_MAX_LOOKAHEAD_DAYS && results.length < NEXT_AVAILABLE_MAX_DATES;
      offset += 1
    ) {
      const candidateDate = addDays(fromDate, offset);
      const { slots } = await this.generateSlots(db, assignment, candidateDate);
      if (slots.length > 0) {
        results.push({
          date: candidateDate,
          availableSlotCount: slots.length,
          firstAvailableAt: slots[0].startsAt,
        });
      }
    }
    return results;
  }

  private async generateSlots(
    db: DbClient,
    assignment: AssignmentForSlots,
    date: string,
    options: { excludeAppointmentId?: string; includeUnavailable?: boolean } = {},
  ): Promise<GenerateSlotsResult> {
    const includeUnavailable = options.includeUnavailable ?? false;
    const timezone = assignment.clinicLocation.timezone;
    const dayStart = clinicLocalMinuteToUtc(date, 0, timezone);
    const dayEnd = clinicLocalMinuteToUtc(date, 1440, timezone);
    const dateValue = new Date(`${date}T00:00:00.000Z`);
    const [schedules, exceptions, appointments] = await Promise.all([
      db.practitionerSchedule.findMany({
        where: {
          assignmentId: assignment.id,
          active: true,
          dayOfWeek: weekdayForDate(date),
          effectiveFrom: { lte: dateValue },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: dateValue } }],
        },
      }),
      db.practitionerScheduleException.findMany({
        where: { assignmentId: assignment.id, startsAt: { lt: dayEnd }, endsAt: { gt: dayStart } },
      }),
      db.appointment.findMany({
        where: {
          ...(options.excludeAppointmentId ? { id: { not: options.excludeAppointmentId } } : {}),
          doctorId: assignment.practitionerUserId,
          clinicLocationId: assignment.clinicLocationId,
          status: 'upcoming',
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const windows = schedules
      .map((schedule) => ({ start: schedule.startMinute, end: schedule.endMinute }))
      .concat(
        exceptions
          .filter((item) => item.kind === 'override')
          .map((exception) => ({
            start: Math.max(
              0,
              Math.round((exception.startsAt.getTime() - dayStart.getTime()) / 60_000),
            ),
            end: Math.min(
              1440,
              Math.round((exception.endsAt.getTime() - dayStart.getTime()) / 60_000),
            ),
          })),
      )
      .sort((a, b) => a.start - b.start);

    const workingDay = windows.length > 0;
    const blockingExceptions = exceptions.filter((item) => item.kind === 'unavailable');
    const now = Date.now();

    const buildSlot = (minute: number, status: SlotStatus, bookedCount: number): GeneratedSlot => {
      const startsAt = clinicLocalMinuteToUtc(date, minute, timezone);
      const endsAt = clinicLocalMinuteToUtc(
        date,
        minute + assignment.slotDurationMinutes,
        timezone,
      );
      const payload: SlotReferencePayload = {
        v: 1,
        assignmentId: assignment.id,
        assignmentVersion: assignment.version,
        practitionerId: assignment.practitionerUserId,
        organizationId: assignment.organizationId,
        clinicLocationId: assignment.clinicLocationId,
        departmentId: assignment.departmentId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      };
      const reasonCode: UnavailableReasonCode | null =
        status === 'PAST'
          ? 'SLOT_IN_PAST'
          : status === 'BLOCKED'
            ? 'SCHEDULE_BLOCKED'
            : status === 'FULL'
              ? 'CAPACITY_REACHED'
              : status === 'BREAK'
                ? 'BREAK_TIME'
                : null;
      return {
        slotId: issueSlotReference(payload, this.slotSecret),
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        capacity: assignment.capacity,
        bookedCount,
        remainingCapacity: Math.max(assignment.capacity - bookedCount, 0),
        status,
        selectable: status === 'AVAILABLE',
        unavailableReason: reasonCode
          ? { code: reasonCode, display: UNAVAILABLE_REASON_DISPLAY[reasonCode] }
          : null,
      };
    };

    const unique = new Map<string, GeneratedSlot>();

    const classifyWithinWindow = (
      startsAt: Date,
      endsAt: Date,
    ): { status: SlotStatus; bookedCount: number } => {
      const bookedCount = appointments.filter((appointment) =>
        overlaps(startsAt, endsAt, appointment.startAt, appointment.endAt),
      ).length;
      if (startsAt.getTime() <= now) return { status: 'PAST', bookedCount };
      if (
        blockingExceptions.some((exception) =>
          overlaps(startsAt, endsAt, exception.startsAt, exception.endsAt),
        )
      )
        return { status: 'BLOCKED', bookedCount };
      if (bookedCount >= assignment.capacity) return { status: 'FULL', bookedCount };
      return { status: 'AVAILABLE', bookedCount };
    };

    if (!includeUnavailable) {
      for (const window of windows) {
        for (
          let minute = window.start;
          minute + assignment.slotDurationMinutes <= window.end;
          minute += assignment.slotDurationMinutes
        ) {
          const startsAt = clinicLocalMinuteToUtc(date, minute, timezone);
          const endsAt = clinicLocalMinuteToUtc(
            date,
            minute + assignment.slotDurationMinutes,
            timezone,
          );
          const { status, bookedCount } = classifyWithinWindow(startsAt, endsAt);
          if (status !== 'AVAILABLE') continue;
          unique.set(startsAt.toISOString(), buildSlot(minute, status, bookedCount));
        }
      }
    } else if (workingDay) {
      const scheduleStartMinute = windows[0].start;
      const scheduleEndMinute = windows.reduce((max, w) => Math.max(max, w.end), windows[0].end);
      for (
        let minute = scheduleStartMinute;
        minute + assignment.slotDurationMinutes <= scheduleEndMinute;
        minute += assignment.slotDurationMinutes
      ) {
        const startsAt = clinicLocalMinuteToUtc(date, minute, timezone);
        const endsAt = clinicLocalMinuteToUtc(
          date,
          minute + assignment.slotDurationMinutes,
          timezone,
        );
        const inWindow = windows.some(
          (w) => minute >= w.start && minute + assignment.slotDurationMinutes <= w.end,
        );
        if (!inWindow) {
          unique.set(startsAt.toISOString(), buildSlot(minute, 'BREAK', 0));
          continue;
        }
        const { status, bookedCount } = classifyWithinWindow(startsAt, endsAt);
        unique.set(startsAt.toISOString(), buildSlot(minute, status, bookedCount));
      }
    }

    const slots = [...unique.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

    let schedule: ScheduleSummary | null = null;
    if (workingDay) {
      const scheduleStartMinute = windows[0].start;
      const scheduleEndMinute = windows.reduce((max, w) => Math.max(max, w.end), windows[0].end);
      const breaks: ScheduleBreak[] = [];
      for (let i = 0; i < windows.length - 1; i += 1) {
        if (windows[i].end < windows[i + 1].start) {
          breaks.push({
            startsAt: clinicLocalMinuteToUtc(date, windows[i].end, timezone).toISOString(),
            endsAt: clinicLocalMinuteToUtc(date, windows[i + 1].start, timezone).toISOString(),
            reasonCode: 'BREAK_TIME',
          });
        }
      }
      for (const exception of blockingExceptions) {
        const clippedStart = new Date(Math.max(exception.startsAt.getTime(), dayStart.getTime()));
        const clippedEnd = new Date(Math.min(exception.endsAt.getTime(), dayEnd.getTime()));
        if (clippedStart < clippedEnd) {
          breaks.push({
            startsAt: clippedStart.toISOString(),
            endsAt: clippedEnd.toISOString(),
            reasonCode: 'SCHEDULE_BLOCKED',
          });
        }
      }
      breaks.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
      schedule = {
        startsAt: clinicLocalMinuteToUtc(date, scheduleStartMinute, timezone).toISOString(),
        endsAt: clinicLocalMinuteToUtc(date, scheduleEndMinute, timezone).toISOString(),
        breaks,
      };
    }

    return { slots, workingDay, schedule };
  }

  async consumeSlot(db: DbClient, slotId: string, excludeAppointmentId?: string) {
    const payload = verifySlotReference(slotId, this.slotSecret);
    if (!payload) {
      throw new ValidationAppError(
        [{ field: 'slotId', code: 'INVALID_SLOT_REFERENCE' }],
        'Invalid slot reference.',
      );
    }
    const assignment = await db.practitionerClinicAssignment.findFirst({
      where: {
        id: payload.assignmentId,
        version: payload.assignmentVersion,
        practitionerUserId: payload.practitionerId,
        organizationId: payload.organizationId,
        clinicLocationId: payload.clinicLocationId,
        departmentId: payload.departmentId,
        active: true,
        practitioner: { status: 'active', user: { status: 'active' } },
        clinicLocation: { status: 'active' },
        department: { status: 'active' },
      },
      include: { clinicLocation: true, department: true },
    });
    if (!assignment)
      throw new ConflictAppError(
        'APPOINTMENT_SLOT_UNAVAILABLE',
        'This slot is no longer available.',
      );

    const startsAt = new Date(payload.startsAt);
    const endsAt = new Date(payload.endsAt);
    if (
      !Number.isFinite(startsAt.getTime()) ||
      !Number.isFinite(endsAt.getTime()) ||
      startsAt <= new Date()
    ) {
      throw new ConflictAppError(
        'APPOINTMENT_SLOT_UNAVAILABLE',
        'This slot is no longer available.',
      );
    }
    const date = new Intl.DateTimeFormat('en-CA', {
      timeZone: assignment.clinicLocation.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(startsAt);
    const { slots } = await this.generateSlots(db, assignment, date, { excludeAppointmentId });
    const matched = slots.find(
      (slot) => slot.startsAt === payload.startsAt && slot.endsAt === payload.endsAt,
    );
    if (!matched || !matched.selectable) {
      throw new ConflictAppError(
        'APPOINTMENT_SLOT_UNAVAILABLE',
        'This slot is no longer available.',
      );
    }
    if (excludeAppointmentId) {
      const conflictingCount = await db.appointment.count({
        where: {
          id: { not: excludeAppointmentId },
          doctorId: payload.practitionerId,
          status: 'upcoming',
          startAt: { lt: endsAt },
          endAt: { gt: startsAt },
        },
      });
      if (conflictingCount >= assignment.capacity) {
        throw new ConflictAppError(
          'APPOINTMENT_SLOT_UNAVAILABLE',
          'This slot is no longer available.',
        );
      }
    }
    return { assignment, startsAt, endsAt };
  }

  private async requireAssignment(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    clinicLocationId: string,
  ) {
    const scope = organizationScope(principal);
    const assignment = await this.prisma.practitionerClinicAssignment.findFirst({
      where: {
        practitionerUserId: practitionerId,
        clinicLocationId,
        active: true,
        ...(scope ? { organizationId: { in: scope } } : {}),
      },
      include: { clinicLocation: true, department: true },
    });
    if (!assignment) {
      throw new NotFoundAppError('Practitioner clinic assignment not found.');
    }
    return assignment;
  }

  async getSchedule(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    clinicLocationId: string,
  ) {
    const assignment = await this.requireAssignment(principal, practitionerId, clinicLocationId);
    const [weeklySchedule, exceptions] = await Promise.all([
      this.prisma.practitionerSchedule.findMany({
        where: { assignmentId: assignment.id, active: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
      }),
      this.prisma.practitionerScheduleException.findMany({
        where: { assignmentId: assignment.id, endsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
      }),
    ]);
    return { data: toPractitionerScheduleResponse(assignment, weeklySchedule, exceptions) };
  }

  async replaceWeeklySchedule(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    clinicLocationId: string,
    dto: ReplaceWeeklyScheduleRequest,
    context: RequestContext,
  ) {
    const assignment = await this.requireAssignment(principal, practitionerId, clinicLocationId);
    assertCanManageSchedule(principal, assignment);

    dto.windows.forEach((window, index) => {
      if (window.startMinute >= window.endMinute) {
        throw new ValidationAppError(
          [{ field: `windows[${index}]`, code: 'INVALID_WINDOW_RANGE' }],
          'startMinute must be before endMinute.',
        );
      }
      if (window.effectiveTo && window.effectiveFrom && window.effectiveTo < window.effectiveFrom) {
        throw new ValidationAppError(
          [{ field: `windows[${index}].effectiveTo`, code: 'INVALID_EFFECTIVE_RANGE' }],
          'effectiveTo must not be before effectiveFrom.',
        );
      }
    });

    const today = new Date().toISOString().slice(0, 10);
    const weeklySchedule = await this.prisma.$transaction(async (tx) => {
      await tx.practitionerSchedule.updateMany({
        where: { assignmentId: assignment.id, active: true },
        data: { active: false },
      });
      if (dto.windows.length > 0) {
        await tx.practitionerSchedule.createMany({
          data: dto.windows.map((window) => ({
            assignmentId: assignment.id,
            dayOfWeek: window.dayOfWeek,
            startMinute: window.startMinute,
            endMinute: window.endMinute,
            effectiveFrom: new Date(window.effectiveFrom ?? today),
            effectiveTo: window.effectiveTo ? new Date(window.effectiveTo) : null,
            active: true,
          })),
        });
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'practitioner.schedule.replaced',
          resourceType: 'practitioner_clinic_assignment',
          resourceId: assignment.id,
          organizationId: assignment.organizationId,
          clinicLocationId: assignment.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return tx.practitionerSchedule.findMany({
        where: { assignmentId: assignment.id, active: true },
        orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
      });
    });

    const exceptions = await this.prisma.practitionerScheduleException.findMany({
      where: { assignmentId: assignment.id, endsAt: { gte: new Date() } },
      orderBy: { startsAt: 'asc' },
    });
    return { data: toPractitionerScheduleResponse(assignment, weeklySchedule, exceptions) };
  }

  async listScheduleExceptions(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    clinicLocationId: string,
  ) {
    const assignment = await this.requireAssignment(principal, practitionerId, clinicLocationId);
    const exceptions = await this.prisma.practitionerScheduleException.findMany({
      where: { assignmentId: assignment.id },
      orderBy: { startsAt: 'asc' },
    });
    return { data: exceptions.map(toScheduleExceptionResponse) };
  }

  async createScheduleException(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    clinicLocationId: string,
    dto: CreateScheduleExceptionRequest,
    context: RequestContext,
  ) {
    const assignment = await this.requireAssignment(principal, practitionerId, clinicLocationId);
    assertCanManageSchedule(principal, assignment);

    const startsAt = new Date(dto.startsAt);
    const endsAt = new Date(dto.endsAt);
    if (!(startsAt < endsAt)) {
      throw new ValidationAppError(
        [{ field: 'endsAt', code: 'INVALID_RANGE' }],
        'endsAt must be after startsAt.',
      );
    }

    const exception = await this.prisma.$transaction(async (tx) => {
      const created = await tx.practitionerScheduleException.create({
        data: {
          assignmentId: assignment.id,
          kind: dto.kind,
          startsAt,
          endsAt,
          reason: dto.reason ?? null,
        },
      });
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'practitioner.schedule_exception.created',
          resourceType: 'practitioner_schedule_exception',
          resourceId: created.id,
          organizationId: assignment.organizationId,
          clinicLocationId: assignment.clinicLocationId,
          reason: dto.reason ?? null,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
      return created;
    });

    return { data: toScheduleExceptionResponse(exception) };
  }

  async deleteScheduleException(
    principal: AuthenticatedPrincipal,
    practitionerId: string,
    clinicLocationId: string,
    exceptionId: string,
    context: RequestContext,
  ) {
    const assignment = await this.requireAssignment(principal, practitionerId, clinicLocationId);
    assertCanManageSchedule(principal, assignment);

    await this.prisma.$transaction(async (tx) => {
      const result = await tx.practitionerScheduleException.deleteMany({
        where: { id: exceptionId, assignmentId: assignment.id },
      });
      if (result.count === 0) {
        throw new NotFoundAppError('Schedule exception not found.');
      }
      await this.audit.write(
        {
          actorId: principal.userId,
          action: 'practitioner.schedule_exception.deleted',
          resourceType: 'practitioner_schedule_exception',
          resourceId: exceptionId,
          organizationId: assignment.organizationId,
          clinicLocationId: assignment.clinicLocationId,
          result: 'success',
          requestId: context.requestId ?? null,
          ip: context.ip ?? null,
          userAgent: context.userAgent ?? null,
        },
        tx,
      );
    });

    return { data: { deleted: true } };
  }
}
