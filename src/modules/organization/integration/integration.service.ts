import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';
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
    return buildPagedResult(data, total, page, limit);
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
    return buildPagedResult(data, total, 1, total);
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

  // ── Mailbox (no Prisma model — tenant-scoped in-memory store) ─────────────
  private readonly mailboxes = new Map<string, Array<Record<string, unknown> & { id: string }>>();
  private readonly mailboxViewers = new Map<string, unknown[]>();
  private readonly mailboxExchanges = new Map<string, Array<Record<string, unknown> & { id: string }>>();

  private mailboxList(tenantId: string) {
    if (!this.mailboxes.has(tenantId)) this.mailboxes.set(tenantId, []);
    return this.mailboxes.get(tenantId)!;
  }

  async listMailboxes(tenantId: string, query: Record<string, string>) {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const keyword = (query.keyword ?? '').toLowerCase();
    let items = this.mailboxList(tenantId);
    if (keyword) {
      items = items.filter((m) => {
        const title = String(m.title ?? '').toLowerCase();
        const content = String(m.content ?? '').toLowerCase();
        return title.includes(keyword) || content.includes(keyword);
      });
    }
    const total = items.length;
    const slice = items.slice((page - 1) * limit, page * limit);
    return buildPagedResult(slice, total, page, limit);
  }

  async getMailbox(id: string) {
    for (const list of this.mailboxes.values()) {
      const found = list.find((m) => m.id === id);
      if (found) return found;
    }
    return { id, title: '', content: '', departments: '', employees: '', attachments: '' };
  }

  async upsertMailbox(tenantId: string, dto: Dto, actor: RequestUser) {
    const list = this.mailboxList(tenantId);
    const id = (dto.id as string) ?? `mb-${Date.now()}`;
    const payload = {
      id,
      tenantId,
      title: (dto.title as string) ?? '',
      content: (dto.content as string) ?? '',
      departments: (dto.departments as string) ?? '',
      employees: (dto.employees as string) ?? '',
      attachments: (dto.attachments as string) ?? '',
      updatedBy: actor.id,
      updatedAt: new Date().toISOString(),
    };
    const idx = list.findIndex((m) => m.id === id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...payload };
      return list[idx];
    }
    const created = { ...payload, createdBy: actor.id, createdAt: new Date().toISOString() };
    list.push(created);
    return created;
  }

  async deleteMailbox(id: string) {
    for (const [tenantId, list] of this.mailboxes.entries()) {
      const next = list.filter((m) => m.id !== id);
      if (next.length !== list.length) {
        this.mailboxes.set(tenantId, next);
        this.mailboxViewers.delete(id);
        this.mailboxExchanges.delete(id);
        return { message: 'Deleted', id };
      }
    }
    return { message: 'Deleted', id };
  }

  listMailboxViewers(mailboxId: string) {
    return this.mailboxViewers.get(mailboxId) ?? [];
  }

  updateMailboxViewer(dto: Dto) {
    const mailboxId = String(dto.id ?? dto.mailboxId ?? '');
    const employees = String(dto.employees ?? '');
    const viewers = employees
      ? employees.split(',').map((e) => e.trim()).filter(Boolean).map((employeeId) => ({ employeeId, mailboxId }))
      : [];
    this.mailboxViewers.set(mailboxId, viewers);
    return { id: mailboxId, employees, viewers, updated: true };
  }

  listMailboxExchanges(mailboxId: string, query: Record<string, string>) {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    const items = (this.mailboxExchanges.get(mailboxId) ?? []).filter(
      (e) => !query.mailboxId || String(e.mailboxId ?? mailboxId) === String(query.mailboxId ?? mailboxId),
    );
    const total = items.length;
    const slice = items.slice((page - 1) * limit, page * limit);
    return buildPagedResult(slice, total, page, limit);
  }

  async upsertMailboxExchange(dto: Dto) {
    const mailboxId = String(dto.mailboxId ?? '');
    const id = (dto.id as string) ?? `mbex-${Date.now()}`;
    const list = this.mailboxExchanges.get(mailboxId) ?? [];
    const payload = { ...dto, id, mailboxId, updatedAt: new Date().toISOString() };
    const idx = list.findIndex((e) => e.id === id);
    if (idx >= 0) list[idx] = { ...list[idx], ...payload };
    else list.push(payload as Record<string, unknown> & { id: string });
    this.mailboxExchanges.set(mailboxId, list);
    return list.find((e) => e.id === id) ?? payload;
  }

  deleteMailboxExchange(id: string) {
    for (const [mailboxId, list] of this.mailboxExchanges.entries()) {
      const next = list.filter((e) => e.id !== id);
      if (next.length !== list.length) {
        this.mailboxExchanges.set(mailboxId, next);
        return { message: 'Deleted', id };
      }
    }
    return { message: 'Deleted', id };
  }
}
