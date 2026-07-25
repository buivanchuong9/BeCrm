import { PractitionerSchedule, PractitionerScheduleException } from '@prisma/client';

export function toScheduleWindowResponse(row: PractitionerSchedule) {
  return {
    id: row.id,
    dayOfWeek: row.dayOfWeek,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    effectiveFrom: row.effectiveFrom.toISOString().slice(0, 10),
    effectiveTo: row.effectiveTo ? row.effectiveTo.toISOString().slice(0, 10) : null,
  };
}

export function toScheduleExceptionResponse(row: PractitionerScheduleException) {
  return {
    id: row.id,
    kind: row.kind,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt.toISOString(),
    reason: row.reason,
  };
}

export function toPractitionerScheduleResponse(
  assignment: {
    id: string;
    practitionerUserId: string;
    clinicLocationId: string;
    slotDurationMinutes: number;
    capacity: number;
    clinicLocation: { timezone: string };
  },
  weeklySchedule: PractitionerSchedule[],
  exceptions: PractitionerScheduleException[],
) {
  return {
    practitionerId: assignment.practitionerUserId,
    clinicLocationId: assignment.clinicLocationId,
    assignmentId: assignment.id,
    timezone: assignment.clinicLocation.timezone,
    slotDurationMinutes: assignment.slotDurationMinutes,
    capacity: assignment.capacity,
    weeklySchedule: weeklySchedule.map(toScheduleWindowResponse),
    exceptions: exceptions.map(toScheduleExceptionResponse),
  };
}
