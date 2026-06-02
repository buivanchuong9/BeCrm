import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
type Dto = Record<string, unknown>;

@Injectable()
export class IntegrationService {
  constructor(private prisma: PrismaService) {}

  async listZaloOA(tenantId: string) { return this.prisma.zaloOA.findMany({ where: { tenantId, deletedAt: null } }); }
  async upsertZaloOA(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.zaloOA.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.zaloOA.create({ data: { tenantId: actor.tenantId, oaId: dto.oaId as string, oaName: dto.oaName as string, accessToken: dto.accessToken as string | undefined, refreshToken: dto.refreshToken as string | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteZaloOA(id: string, actor: RequestUser) { await this.prisma.zaloOA.update({ where: { id }, data: { deletedAt: new Date() } }); return { message: 'Deleted' }; }

  async listZaloChats(tenantId: string, q: Dto) { return { data: [], total: 0 }; }
  async getZaloChat(id: string) { return { id }; }
  async sendZaloMessage(dto: Dto) { return { sent: true, message: 'Zalo message queued' }; }
  async listZaloFollowers(tenantId: string, q: Dto) { return { data: [], total: 0 }; }

  async listZNSTemplates(tenantId: string) { return this.prisma.templateZalo.findMany({ where: { tenantId, deletedAt: null } }); }
  async upsertZNSTemplate(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.templateZalo.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.templateZalo.create({ data: { tenantId: actor.tenantId, name: dto.name as string, templateId: dto.templateId as string | undefined, content: dto.content as string | undefined, params: dto.params as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteZNSTemplate(id: string, actor: RequestUser) { await this.prisma.templateZalo.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }

  async listObjectAttributes(tenantId: string, objectType: string) {
    return this.prisma.objectAttribute.findMany({ where: { tenantId, objectType, deletedAt: null }, orderBy: { position: 'asc' } });
  }
  async getObjectAttribute(id: string) { return this.prisma.objectAttribute.findUnique({ where: { id } }); }
  async upsertObjectAttribute(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.objectAttribute.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.objectAttribute.create({ data: { tenantId: actor.tenantId, objectType: dto.objectType as string, fieldKey: dto.fieldKey as string, fieldLabel: dto.fieldLabel as string, fieldType: (dto.fieldType as string) ?? 'text', position: (dto.position as number) ?? 0, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteObjectAttribute(id: string, actor: RequestUser) { await this.prisma.objectAttribute.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }

  async listLoginLogs(tenantId: string, q: Dto = {}) {
    const page = Number(q.page ?? 1);
    const limit = Number(q.limit ?? 20);
    const [data, total] = await Promise.all([
      this.prisma.userLoginLog.findMany({ where: { tenantId, ...(q.userId ? { userId: q.userId as string } : {}) }, skip: (page - 1) * limit, take: limit, orderBy: { loggedAt: 'desc' } }),
      this.prisma.userLoginLog.count({ where: { tenantId } }),
    ]);
    return { data, total, page, limit };
  }

  async getCustomerAnalytics(tenantId: string, type: string, q: Dto) {
    if (type === 'total') {
      const [total, thisMonth] = await Promise.all([
        this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
        this.prisma.customer.count({ where: { tenantId, deletedAt: null, createdAt: { gte: new Date(new Date().setDate(1)) } } }),
      ]);
      return { total, thisMonth };
    }
    if (type === 'fields') return { fields: ['customerGroup', 'customerSource', 'status', 'iamEmployeeId'] };
    const page = Number(q.page ?? 1), limit = Number(q.limit ?? 10);
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where: { tenantId, deletedAt: null }, skip: (page - 1) * limit, take: limit, select: { id: true, name: true, phone: true, createdAt: true } }),
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
    ]);
    return { data, total };
  }

  async listReports(tenantId: string) { return this.prisma.report.findMany({ where: { tenantId, deletedAt: null }, orderBy: { name: 'asc' } }); }
  async upsertReport(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.report.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.report.create({ data: { tenantId: actor.tenantId, name: dto.name as string, code: dto.code as string | undefined, reportType: (dto.reportType as string) ?? 'general', config: dto.config as object | undefined, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteReport(id: string, actor: RequestUser) { await this.prisma.report.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }

  async listTreatmentTimes(tenantId: string, q: Dto) {
    return this.prisma.treatmentTime.findMany({ where: { tenantId, deletedAt: null, ...(q.roomId ? { roomId: q.roomId as string } : {}), ...(q.iamDoctorId ? { iamDoctorId: q.iamDoctorId as string } : {}) }, orderBy: { dayOfWeek: 'asc' } });
  }
  async getTreatmentTime(id: string) { return this.prisma.treatmentTime.findUnique({ where: { id } }); }
  async upsertTreatmentTime(dto: Dto, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) return this.prisma.treatmentTime.update({ where: { id }, data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any });
    return this.prisma.treatmentTime.create({ data: { tenantId: actor.tenantId, roomId: dto.roomId as string | undefined, iamDoctorId: dto.iamDoctorId as string | undefined, dayOfWeek: dto.dayOfWeek as number | undefined, startTime: dto.startTime as string | undefined, endTime: dto.endTime as string | undefined, capacity: (dto.capacity as number) ?? 1, createdBy: actor.id, updatedBy: actor.id } });
  }
  async deleteTreatmentTime(id: string, actor: RequestUser) { await this.prisma.treatmentTime.update({ where: { id }, data: { deletedAt: new Date(), deletedBy: actor.id } }); return { message: 'Deleted' }; }
}
