import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { ConflictAppError } from '../../common/errors/app-error';
import { AuthenticatedPrincipal } from '../../common/auth/auth.types';
import { isSuperAdministrator } from './policies/appointment-policies';

/** docs/api.md section 41 "Appointment booking": the tstzrange EXCLUDE
 * constraints on (doctor_id, time_range) and (patient_id, time_range) are
 * handwritten SQL (see migration 20260716023720) — Prisma has no native
 * concept of them, so a violation surfaces as PrismaClientUnknownRequestError
 * with the Postgres SQLSTATE 23P01 message, not a typed P2002. This maps that
 * raw message back to the two documented, distinguishable error codes. */
export function mapExclusionViolation(err: unknown): never {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes('excl_appointment_doctor_slot')) {
    throw new ConflictAppError(
      'APPOINTMENT_SLOT_UNAVAILABLE',
      'The selected appointment slot is no longer available.',
    );
  }
  if (message.includes('excl_appointment_patient_slot')) {
    throw new ConflictAppError(
      'APPOINTMENT_PATIENT_TIME_CONFLICT',
      'You already have another appointment that overlaps this time.',
    );
  }
  throw err as Error;
}

@Injectable()
export class AppointmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findVisibleById(
    principal: AuthenticatedPrincipal,
    appointmentId: string,
  ): Promise<Appointment | null> {
    if (isSuperAdministrator(principal)) {
      return this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    }
    const orgWideIds = principal.memberships
      .filter((m) => m.role === 'receptionist' || m.role === 'medical_administrator')
      .map((m) => m.organizationId);
    return this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        OR: [
          { patient: { userId: principal.userId } },
          { doctorId: principal.userId },
          ...(orgWideIds.length > 0 ? [{ organizationId: { in: orgWideIds } }] : []),
        ],
      },
    });
  }

  async findById(appointmentId: string): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({ where: { id: appointmentId } });
  }

  async listForPatient(
    patientId: string,
    filters: { status?: AppointmentStatus; dateFrom?: Date; dateTo?: Date },
    page: number,
    limit: number,
  ): Promise<{ rows: Appointment[]; total: number }> {
    const where: Prisma.AppointmentWhereInput = {
      patientId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lt: filters.dateTo } : {}),
            },
          }
        : {}),
    };
    return this.paginate(where, page, limit);
  }

  async listForDoctor(
    doctorId: string,
    filters: { status?: AppointmentStatus; dateFrom?: Date; dateTo?: Date },
    page: number,
    limit: number,
  ): Promise<{ rows: Appointment[]; total: number }> {
    const where: Prisma.AppointmentWhereInput = {
      doctorId,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.dateFrom || filters.dateTo
        ? {
            startAt: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lt: filters.dateTo } : {}),
            },
          }
        : {}),
    };
    return this.paginate(where, page, limit);
  }

  async listForOrganizations(params: {
    organizationIds: string[] | null;
    status?: AppointmentStatus;
    doctorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page: number;
    limit: number;
  }): Promise<{ rows: Appointment[]; total: number }> {
    const where: Prisma.AppointmentWhereInput = {
      ...(params.organizationIds ? { organizationId: { in: params.organizationIds } } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.doctorId ? { doctorId: params.doctorId } : {}),
      ...(params.dateFrom || params.dateTo
        ? {
            startAt: {
              ...(params.dateFrom ? { gte: params.dateFrom } : {}),
              ...(params.dateTo ? { lt: params.dateTo } : {}),
            },
          }
        : {}),
    };
    return this.paginate(where, params.page, params.limit);
  }

  private async paginate(
    where: Prisma.AppointmentWhereInput,
    page: number,
    limit: number,
  ): Promise<{ rows: Appointment[]; total: number }> {
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({
        where,
        orderBy: { startAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return { rows, total };
  }

  async create(
    tx: Prisma.TransactionClient,
    data: Prisma.AppointmentUncheckedCreateInput,
  ): Promise<Appointment> {
    try {
      return await tx.appointment.create({ data });
    } catch (err) {
      mapExclusionViolation(err);
    }
  }

  async updateSlot(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    startAt: Date,
    endAt: Date,
  ): Promise<Prisma.BatchPayload> {
    try {
      return await tx.appointment.updateMany({
        where: { id, version: expectedVersion, status: 'upcoming' },
        data: { startAt, endAt, version: { increment: 1 } },
      });
    } catch (err) {
      mapExclusionViolation(err);
    }
  }
}
