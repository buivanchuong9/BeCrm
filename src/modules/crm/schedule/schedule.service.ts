import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

type Dto = Record<string, unknown>;

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async listSchedules(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.customerId) where.customerId = q.customerId;
    if (q.status) where.status = q.status;
    const [data, total] = await Promise.all([
      this.prisma.scheduleCommon.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { scheduledAt: 'asc' } }),
      this.prisma.scheduleCommon.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async getSchedule(id: string) { return this.prisma.scheduleCommon.findUnique({ where: { id } }); }

  async upsertSchedule(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.scheduleCommon.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } } as any });
    return this.prisma.scheduleCommon.create({ data: { tenantId: actor.tenantId, title: dto.title as string, customerId: dto.customerId as string | undefined, contactId: dto.contactId as string | undefined, iamEmployeeId: dto.iamEmployeeId as string | undefined, scheduledAt: new Date(dto.scheduledAt as string), status: 'pending', note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteSchedule(id: string, actor: RequestUser) {
    await this.prisma.scheduleCommon.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async cancelSchedule(id: string, actor: RequestUser) {
    return this.prisma.scheduleCommon.update({ where: { id }, data: { status: 'cancelled', updatedBy: actor.id } });
  }

  async listConsultantSchedules(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.customerId) where.customerId = q.customerId;
    const [data, total] = await Promise.all([
      this.prisma.scheduleConsultant.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { scheduledAt: 'asc' } }),
      this.prisma.scheduleConsultant.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsertConsultantSchedule(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.scheduleConsultant.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.scheduleConsultant.create({ data: { tenantId: actor.tenantId, customerId: dto.customerId as string | undefined, iamConsultantId: dto.iamConsultantId as string | undefined, title: dto.title as string, scheduledAt: new Date(dto.scheduledAt as string), status: 'pending', roomId: dto.roomId as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteConsultantSchedule(id: string, actor: RequestUser) {
    await this.prisma.scheduleConsultant.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listRooms(tenantId: string) { return this.prisma.treatmentRoom.findMany({ where: { tenantId, deletedAt: null }, orderBy: { name: 'asc' } }); }

  async upsertRoom(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.treatmentRoom.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.treatmentRoom.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, capacity: (dto.capacity as number) ?? 1, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteRoom(id: string, actor: RequestUser) {
    await this.prisma.treatmentRoom.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }

  async listTreatmentHistories(tenantId: string, q: Dto = {}, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (q.customerId) where.customerId = q.customerId;
    const [data, total] = await Promise.all([
      this.prisma.treatmentHistory.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { treatmentDate: 'desc' } }),
      this.prisma.treatmentHistory.count({ where }),
    ]);
    return { data, total, page, limit };
  }

  async upsertTreatmentHistory(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.treatmentHistory.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.treatmentHistory.create({ data: { tenantId: actor.tenantId, customerId: dto.customerId as string | undefined, roomId: dto.roomId as string | undefined, iamDoctorId: dto.iamDoctorId as string | undefined, treatmentDate: dto.treatmentDate ? new Date(dto.treatmentDate as string) : new Date(), serviceName: dto.serviceName as string | undefined, diagnosis: dto.diagnosis as string | undefined, prescription: dto.prescription as string | undefined, note: dto.note as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }

  async deleteTreatmentHistory(id: string, actor: RequestUser) {
    await this.prisma.treatmentHistory.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } });
    return { message: 'Deleted' };
  }
}
