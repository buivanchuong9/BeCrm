import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { AuthenticatedPrincipal } from '../../core/security/auth.types';
import {
  ConflictAppError,
  ForbiddenAppError,
  ValidationAppError,
} from '../../core/errors/app-error';
import { PrismaService } from '../../core/database/prisma.service';
import { AppConfiguration } from '../../core/configuration/configuration';
import { AvailabilityQuery } from './dto/availability.query';
import { ListPractitionersQuery } from './dto/list-practitioners.query';
import { clinicLocalMinuteToUtc, weekdayForDate } from './timezone.util';
import {
  issueSlotReference,
  SlotReferencePayload,
  verifySlotReference,
} from './slot-reference.util';

type DbClient = Prisma.TransactionClient | PrismaService;

function organizationScope(principal: AuthenticatedPrincipal): string[] | null {
  if (principal.memberships.some((membership) => membership.role === 'super_administrator'))
    return null;
  return [...new Set(principal.memberships.map((membership) => membership.organizationId))];
}

function overlaps(startsAt: Date, endsAt: Date, rangeStart: Date, rangeEnd: Date): boolean {
  return startsAt < rangeEnd && endsAt > rangeStart;
}

@Injectable()
export class PractitionersService {
  private readonly slotSecret: string;

  constructor(
    private readonly prisma: PrismaService,
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
          slotDurationMinutes: null,
          capacity: null,
          slots: [],
        },
      };
    }

    const slots = await this.generateSlots(this.prisma, assignment, query.date);
    return {
      data: {
        practitionerId,
        clinicLocationId: assignment.clinicLocationId,
        timezone: assignment.clinicLocation.timezone,
        date: query.date,
        slotDurationMinutes: assignment.slotDurationMinutes,
        capacity: assignment.capacity,
        slots,
      },
    };
  }

  private async generateSlots(
    db: DbClient,
    assignment: {
      id: string;
      version: number;
      practitionerUserId: string;
      organizationId: string;
      clinicLocationId: string;
      departmentId: string;
      slotDurationMinutes: number;
      capacity: number;
      clinicLocation: { timezone: string };
    },
    date: string,
    excludeAppointmentId?: string,
  ) {
    const dayStart = clinicLocalMinuteToUtc(date, 0, assignment.clinicLocation.timezone);
    const dayEnd = clinicLocalMinuteToUtc(date, 1440, assignment.clinicLocation.timezone);
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
          ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
          doctorId: assignment.practitionerUserId,
          clinicLocationId: assignment.clinicLocationId,
          status: 'upcoming',
          startAt: { lt: dayEnd },
          endAt: { gt: dayStart },
        },
        select: { startAt: true, endAt: true },
      }),
    ]);

    const windows = schedules.map((schedule) => ({
      start: schedule.startMinute,
      end: schedule.endMinute,
    }));
    for (const exception of exceptions.filter((item) => item.kind === 'override')) {
      const start = Math.max(
        0,
        Math.round((exception.startsAt.getTime() - dayStart.getTime()) / 60_000),
      );
      const end = Math.min(
        1440,
        Math.round((exception.endsAt.getTime() - dayStart.getTime()) / 60_000),
      );
      windows.push({ start, end });
    }

    const unique = new Map<
      string,
      { slotId: string; startsAt: string; endsAt: string; remainingCapacity: number }
    >();
    for (const window of windows) {
      for (
        let minute = window.start;
        minute + assignment.slotDurationMinutes <= window.end;
        minute += assignment.slotDurationMinutes
      ) {
        const startsAt = clinicLocalMinuteToUtc(date, minute, assignment.clinicLocation.timezone);
        const endsAt = clinicLocalMinuteToUtc(
          date,
          minute + assignment.slotDurationMinutes,
          assignment.clinicLocation.timezone,
        );
        if (startsAt.getTime() <= Date.now()) continue;
        if (
          exceptions.some(
            (exception) =>
              exception.kind === 'unavailable' &&
              overlaps(startsAt, endsAt, exception.startsAt, exception.endsAt),
          )
        )
          continue;
        const booked = appointments.filter((appointment) =>
          overlaps(startsAt, endsAt, appointment.startAt, appointment.endAt),
        ).length;
        if (booked >= assignment.capacity) continue;
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
        unique.set(startsAt.toISOString(), {
          slotId: issueSlotReference(payload, this.slotSecret),
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          remainingCapacity: assignment.capacity - booked,
        });
      }
    }
    return [...unique.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
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
    const validSlots = await this.generateSlots(db, assignment, date, excludeAppointmentId);
    if (
      !validSlots.some(
        (slot) => slot.startsAt === payload.startsAt && slot.endsAt === payload.endsAt,
      )
    ) {
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
}
