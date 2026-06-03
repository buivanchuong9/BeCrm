import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  private baseWhere(tenantId: string) {
    return { tenantId, deletedAt: null };
  }

  // ── Customers ──────────────────────────────────────────────────────────────

  async list(tenantId: string, query?: {
    name?: string; phone?: string; status?: number | string;
    customerGroupId?: string; customerSourceId?: string;
    iamEmployeeId?: string; keyword?: string;
    page?: number | string; limit?: number | string;
    pageIndex?: number | string; pageSize?: number | string;
  }) {
    const page = parsePage(query?.pageIndex ?? query?.page);
    const limit = parseLimit(query?.pageSize ?? query?.limit);

    const where: Record<string, unknown> = this.baseWhere(tenantId);
    const keyword = query?.keyword ?? query?.name;
    if (keyword) where.name = { contains: keyword, mode: 'insensitive' };
    if (query?.phone) where.phone = { contains: query.phone };
    if (query?.status !== undefined && query.status !== '') where.status = Number(query.status);
    if (query?.customerGroupId) where.customerGroupId = query.customerGroupId;
    if (query?.customerSourceId) where.customerSourceId = query.customerSourceId;
    if (query?.iamEmployeeId) where.iamEmployeeId = query.iamEmployeeId;

    const [rows, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customerGroup: { select: { id: true, name: true } },
          customerSource: { select: { id: true, name: true } },
          extraInfos: {
            include: { attributeDef: { select: { fieldName: true } } },
          },
        },
      }),
      this.prisma.customer.count({ where }),
    ]);

    const items = rows.map((c) => {
      const extra: Record<string, unknown> = {};
      for (const ei of c.extraInfos ?? []) {
        extra[ei.attributeDef.fieldName] = ei.value;
      }
      return {
        ...c,
        // FE-expected field aliases
        customerCode: c.code,
        birthday: c.dateOfBirth ? (c.dateOfBirth as Date).toISOString().slice(0, 10) : null,
        createdTime: c.createdAt,
        lstCustomerExtraInfo: c.extraInfos ?? [],
        customerGroupId: c.customerGroupId,
        customerGroupName: c.customerGroup?.name ?? null,
        customerSourceId: c.customerSourceId,
        customerSourceName: c.customerSource?.name ?? null,
        // Employee reference (id only — name requires separate lookup)
        employeeId: c.iamEmployeeId ?? null,
        employeeName: null,
        // Extra info fields flattened
        medicalHistory: (extra['medicalHistory'] as string) ?? null,
        currentDiagnosis: (extra['currentDiagnosis'] as string) ?? null,
        skinType: (extra['skinType'] as string) ?? null,
      };
    });
    return buildPagedResult(items, total, page, limit);
  }

  async listShared(tenantId: string, query?: {
    name?: string; page?: number | string; limit?: number | string;
  }) {
    const page = parsePage(query?.page);
    const limit = parseLimit(query?.limit);
    const where: Record<string, unknown> = this.baseWhere(tenantId);
    if (query?.name) where.name = { contains: query.name, mode: 'insensitive' };

    const [items, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, phone: true, email: true, avatarUrl: true },
      }),
      this.prisma.customer.count({ where }),
    ]);
    return buildPagedResult(items, total, page, limit);
  }

  async listByIds(tenantId: string, ids: string[]) {
    return this.prisma.customer.findMany({
      where: { id: { in: ids }, tenantId, deletedAt: null },
      include: {
        customerGroup: { select: { id: true, name: true } },
        customerSource: { select: { id: true, name: true } },
      },
    });
  }

  async getById(id: string, tenantId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, ...this.baseWhere(tenantId) },
      include: {
        customerGroup: true,
        customerSource: true,
        extraInfos: { include: { attributeDef: { select: { fieldName: true, name: true } } } },
      },
    });
    if (!customer) throw new NotFoundException('Customer', id);
    const extra: Record<string, unknown> = {};
    for (const ei of customer.extraInfos ?? []) {
      extra[ei.attributeDef.fieldName] = ei.value;
    }
    return {
      ...customer,
      customerCode: customer.code,
      birthday: customer.dateOfBirth ? (customer.dateOfBirth as Date).toISOString().slice(0, 10) : null,
      createdTime: customer.createdAt,
      lstCustomerExtraInfo: customer.extraInfos ?? [],
      employeeId: customer.iamEmployeeId ?? null,
      employeeName: null,
      medicalHistory: (extra['medicalHistory'] as string) ?? null,
      currentDiagnosis: (extra['currentDiagnosis'] as string) ?? null,
      skinType: (extra['skinType'] as string) ?? null,
    };
  }

  async getPhone(id: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId, deletedAt: null }, select: { phone: true } });
    if (!c) throw new NotFoundException('Customer', id);
    return { phone: c.phone };
  }

  async getEmail(id: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id, tenantId, deletedAt: null }, select: { email: true } });
    if (!c) throw new NotFoundException('Customer', id);
    return { email: c.email };
  }

  async upsert(
    dto: {
      id?: string; name: string; phone?: string; email?: string; gender?: string;
      dateOfBirth?: Date; address?: string; avatarUrl?: string;
      customerGroupId?: string; customerSourceId?: string; note?: string;
      [key: string]: unknown;
    },
    actor: RequestUser,
  ) {
    const { id, ...data } = dto;
    if (id) {
      return this.prisma.customer.update({
        where: { id },
        data: { ...data, updatedBy: actor.id, rowVersion: { increment: 1 } },
      });
    }
    return this.prisma.customer.create({
      data: {
        tenantId: actor.tenantId,
        iamEmployeeId: actor.id,
        createdBy: actor.id,
        updatedBy: actor.id,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        gender: dto.gender,
        address: dto.address,
        avatarUrl: dto.avatarUrl,
        customerGroupId: dto.customerGroupId,
        customerSourceId: dto.customerSourceId,
        note: dto.note,
      },
    });
  }

  async delete(id: string, actor: RequestUser) {
    await this.prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Customer deleted' };
  }

  async deleteAll(ids: string[], actor: RequestUser) {
    await this.prisma.customer.updateMany({
      where: { id: { in: ids }, tenantId: actor.tenantId },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: `${ids.length} customers deleted` };
  }

  async updateByField(id: string, field: string, value: unknown, actor: RequestUser) {
    return this.prisma.customer.update({
      where: { id },
      data: { [field]: value, updatedBy: actor.id },
    });
  }

  async updateBatchGroup(ids: string[], customerGroupId: string, actor: RequestUser) {
    await this.prisma.customer.updateMany({
      where: { id: { in: ids }, tenantId: actor.tenantId },
      data: { customerGroupId, updatedBy: actor.id },
    });
    return { updated: ids.length };
  }

  async updateBatchSource(ids: string[], customerSourceId: string, actor: RequestUser) {
    await this.prisma.customer.updateMany({
      where: { id: { in: ids }, tenantId: actor.tenantId },
      data: { customerSourceId, updatedBy: actor.id },
    });
    return { updated: ids.length };
  }

  async updateBatchEmployee(ids: string[], iamEmployeeId: string, actor: RequestUser) {
    await this.prisma.customer.updateMany({
      where: { id: { in: ids }, tenantId: actor.tenantId },
      data: { iamEmployeeId, updatedBy: actor.id },
    });
    return { updated: ids.length };
  }

  async updateRelationship(dto: {
    customerId: string; relatedId: string; relationshipType: string;
  }, actor: RequestUser) {
    return this.prisma.customerRelationship.upsert({
      where: { id: `${dto.customerId}_${dto.relatedId}` } as never,
      create: {
        tenantId: actor.tenantId,
        customerId: dto.customerId,
        relatedId: dto.relatedId,
        relationshipType: dto.relationshipType,
        createdBy: actor.id,
      },
      update: { relationshipType: dto.relationshipType },
    });
  }

  async updateBatchRelationship(
    customerIds: string[],
    relatedId: string,
    relationshipType: string,
    actor: RequestUser,
  ) {
    const data = customerIds.map((customerId) => ({
      tenantId: actor.tenantId,
      customerId,
      relatedId,
      relationshipType,
      createdBy: actor.id,
    }));
    await this.prisma.customerRelationship.createMany({ data, skipDuplicates: true });
    return { updated: customerIds.length };
  }

  async linkUser(customerId: string, iamUserId: string, actor: RequestUser) {
    return this.prisma.customer.update({
      where: { id: customerId },
      data: { iamEmployeeId: iamUserId, updatedBy: actor.id },
    });
  }

  async checkInProcess(customerId: string) {
    const [tickets, warranties, opportunities] = await Promise.all([
      this.prisma.ticket.count({ where: { customerId, deletedAt: null } }),
      this.prisma.warranty.count({ where: { customerId, deletedAt: null } }),
      this.prisma.opportunity.count({ where: { customerId, deletedAt: null } }),
    ]);
    return { tickets, warranties, opportunities, total: tickets + warranties + opportunities };
  }

  async getSmsParser(customerId: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null }, select: { name: true, phone: true } });
    if (!c) throw new NotFoundException('Customer', customerId);
    return { name: c.name, phone: c.phone, parser: `Xin chào ${c.name}` };
  }

  async getEmailParser(customerId: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null }, select: { name: true, email: true } });
    if (!c) throw new NotFoundException('Customer', customerId);
    return { name: c.name, email: c.email, parser: `Kính gửi ${c.name}` };
  }

  async getZaloParser(customerId: string, tenantId: string) {
    const c = await this.prisma.customer.findFirst({ where: { id: customerId, tenantId, deletedAt: null }, select: { name: true, phone: true } });
    if (!c) throw new NotFoundException('Customer', customerId);
    return { name: c.name, phone: c.phone, parser: `Xin chào ${c.name}` };
  }

  async sendSms(dto: Record<string, unknown>) {
    return { sent: true, message: 'SMS sent', data: dto };
  }

  async sendEmail(dto: Record<string, unknown>) {
    return { sent: true, message: 'Email sent', data: dto };
  }

  async sendZalo(dto: Record<string, unknown>) {
    return { sent: true, message: 'Zalo message sent', data: dto };
  }

  async getImportTemplate() {
    return { url: '/templates/customer-import.xlsx', message: 'Download import template' };
  }

  async autoProcessImport(dto: Record<string, unknown>, actor: RequestUser) {
    return { processed: true, message: 'Import processed', data: dto };
  }

  async getReport(tenantId: string, query: Record<string, string>) {
    const [total, byGroup, bySource] = await Promise.all([
      this.prisma.customer.count({ where: { tenantId, deletedAt: null } }),
      this.prisma.customer.groupBy({ by: ['customerGroupId'], where: { tenantId, deletedAt: null }, _count: true }),
      this.prisma.customer.groupBy({ by: ['customerSourceId'], where: { tenantId, deletedAt: null }, _count: true }),
    ]);
    return { total, byGroup, bySource };
  }

  async getReportDetail(tenantId: string, query: Record<string, string>) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query.customerGroupId) where.customerGroupId = query.customerGroupId;
    if (query.iamEmployeeId) where.iamEmployeeId = query.iamEmployeeId;
    const page = Number(query.page ?? 1);
    const limit = Number(query.limit ?? 20);
    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.customer.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  // ── Customer Schedulers ────────────────────────────────────────────────────

  async listSchedulers(tenantId: string, query?: {
    customerId?: string; status?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.status) where.status = query.status;

    const [rows, total] = await Promise.all([
      this.prisma.customerScheduler.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { scheduledAt: 'asc' } }),
      this.prisma.customerScheduler.count({ where }),
    ]);
    const data = rows.map((s) => ({
      ...s,
      appointmentDate: s.scheduledAt,
      employeeId: s.iamEmployeeId,
      serviceName: s.title,
      statusName: s.status === 'pending' ? 'Chờ xác nhận' : s.status === 'completed' ? 'Hoàn thành' : s.status,
    }));
    return buildPagedResult(data, total, page, limit);
  }

  async getScheduler(id: string, tenantId: string) {
    const s = await this.prisma.customerScheduler.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!s) throw new NotFoundException('CustomerScheduler', id);
    return s;
  }

  async upsertScheduler(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.customerScheduler.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id, rowVersion: { increment: 1 } as any },
      });
    }
    return this.prisma.customerScheduler.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId as string,
        iamEmployeeId: dto.iamEmployeeId as string ?? actor.id,
        title: dto.title as string,
        content: dto.content as string | undefined,
        scheduledAt: new Date(dto.scheduledAt as string),
        status: 'pending',
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async cancelScheduler(id: string, actor: RequestUser) {
    return this.prisma.customerScheduler.update({
      where: { id },
      data: { status: 'cancelled', updatedBy: actor.id },
    });
  }

  // ── Customer Exchanges ─────────────────────────────────────────────────────

  async listExchanges(tenantId: string, customerId: string, page = 1, limit = 20) {
    const [rows, total] = await Promise.all([
      this.prisma.customerExchange.findMany({
        where: { tenantId, customerId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customerExchange.count({ where: { tenantId, customerId, deletedAt: null } }),
    ]);
    // Map to FE-expected field names (MSW_REMOVAL_BLOCKERS BLOCKER-008/019)
    const data = rows.map((ex) => ({
      ...ex,
      createdTime: ex.createdAt,        // FE: moment(item.createdTime)
      employeeId: ex.iamAuthorId,       // FE: item.employeeId
      employeeUserId: ex.iamAuthorId,   // FE: item.employeeUserId === id comparison
      employeeName: null,               // requires join, stub for now
      employeeAvatar: null,
      type: 1,                          // default exchange type
    }));
    return buildPagedResult(data, total, page, limit);
  }

  async addExchange(dto: {
    customerId: string; exchangeType?: string; content?: string;
    contentDelta?: object; mediaUrls?: object;
  }, actor: RequestUser) {
    return this.prisma.customerExchange.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId,
        iamAuthorId: actor.id,
        exchangeType: dto.exchangeType ?? 'note',
        content: dto.content,
        contentDelta: dto.contentDelta ?? undefined,
        mediaUrls: dto.mediaUrls ?? undefined,
      },
    });
  }

  async deleteExchange(id: string, actor: RequestUser) {
    await this.prisma.customerExchange.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Exchange deleted' };
  }

  // ── Customer Viewers ───────────────────────────────────────────────────────

  async listViewers(tenantId: string, customerId: string) {
    return this.prisma.customerViewer.findMany({ where: { tenantId, customerId } });
  }

  async addViewer(customerId: string, iamUserId: string, actor: RequestUser) {
    return this.prisma.customerViewer.upsert({
      where: { customerId_iamUserId: { customerId, iamUserId } },
      create: { tenantId: actor.tenantId, customerId, iamUserId, createdBy: actor.id },
      update: {},
    });
  }

  async deleteViewer(id: string) {
    await this.prisma.customerViewer.delete({ where: { id } });
    return { message: 'Viewer removed' };
  }

  // ── Telesale Calls ─────────────────────────────────────────────────────────

  async listTelesaleCalls(tenantId: string, query?: {
    customerId?: string; iamEmployeeId?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.iamEmployeeId) where.iamEmployeeId = query.iamEmployeeId;

    const [data, total] = await Promise.all([
      this.prisma.telesaleCall.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { calledAt: 'desc' } }),
      this.prisma.telesaleCall.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async upsertTelesaleCall(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.telesaleCall.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.telesaleCall.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId as string,
        iamEmployeeId: actor.id,
        callType: (dto.callType as string) ?? 'outbound',
        duration: dto.duration as number | undefined,
        status: (dto.status as string) ?? 'completed',
        note: dto.note as string | undefined,
        recordingUrl: dto.recordingUrl as string | undefined,
        calledAt: dto.calledAt ? new Date(dto.calledAt as string) : new Date(),
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  // ── Customer Fields ────────────────────────────────────────────────────────

  async listFields(tenantId: string) {
    return this.prisma.customerField.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { position: 'asc' },
    });
  }

  async upsertField(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.customerField.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.customerField.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        fieldKey: dto.fieldKey as string,
        fieldType: (dto.fieldType as string) ?? 'text',
        isRequired: (dto.isRequired as boolean) ?? false,
        position: (dto.position as number) ?? 0,
        options: dto.options as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteField(id: string, actor: RequestUser) {
    await this.prisma.customerField.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Customer field deleted' };
  }

  async checkDuplicatedAttribute(tenantId: string, fieldName: string, value: string, excludeId?: string) {
    const where: Record<string, unknown> = { tenantId, fieldName };
    if (excludeId) where.id = { not: excludeId };
    const count = await this.prisma.customerAttribute.count({ where });
    return { isDuplicated: count > 0, fieldName, value };
  }

  // ── Opportunities for Customer ─────────────────────────────────────────────

  async listOpportunities(tenantId: string, customerId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where: { tenantId, customerId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.opportunity.count({ where: { tenantId, customerId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  // ── Customer Groups ───────────────────────────────────────────────────────

  async listGroups(tenantId: string, query?: { name?: string }) {
    return this.prisma.customerGroup.findMany({
      where: { tenantId, deletedAt: null, ...(query?.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async upsertGroup(dto: { id?: string; name: string; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.customerGroup.update({
        where: { id: dto.id },
        data: { name: dto.name, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.customerGroup.create({
      data: { tenantId: actor.tenantId, name: dto.name, position: dto.position ?? 0, createdBy: actor.id, updatedBy: actor.id },
    });
  }

  async deleteGroup(id: string, actor: RequestUser) {
    await this.prisma.customerGroup.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Customer group deleted' };
  }

  // ── Customer Sources ──────────────────────────────────────────────────────

  async listSources(tenantId: string, query?: { name?: string }) {
    return this.prisma.customerSource.findMany({
      where: { tenantId, deletedAt: null, ...(query?.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}) },
      orderBy: { position: 'asc' },
    });
  }

  async upsertSource(dto: { id?: string; name: string; position?: number }, actor: RequestUser) {
    if (dto.id) {
      return this.prisma.customerSource.update({
        where: { id: dto.id },
        data: { name: dto.name, position: dto.position ?? 0, updatedBy: actor.id },
      });
    }
    return this.prisma.customerSource.create({
      data: { tenantId: actor.tenantId, name: dto.name, position: dto.position ?? 0, createdBy: actor.id, updatedBy: actor.id },
    });
  }

  async deleteSource(id: string, actor: RequestUser) {
    await this.prisma.customerSource.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Customer source deleted' };
  }

  // ── Attributes ────────────────────────────────────────────────────────────

  async listAttributes(tenantId: string, query?: { name?: string }) {
    return this.prisma.customerAttribute.findMany({
      where: { tenantId, deletedAt: null, ...(query?.name ? { name: { contains: query.name, mode: 'insensitive' } } : {}) },
      include: { children: { where: { deletedAt: null } } },
      orderBy: { position: 'asc' },
    });
  }

  async upsertAttribute(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.customerAttribute.update({
        where: { id },
        data: { ...(dto as Record<string, unknown>), id: undefined, updatedBy: actor.id },
      });
    }
    return this.prisma.customerAttribute.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        fieldName: dto.fieldName as string,
        dataType: (dto.dataType as string) ?? 'text',
        isRequired: (dto.isRequired as boolean) ?? false,
        isReadonly: (dto.isReadonly as boolean) ?? false,
        isUnique: (dto.isUnique as boolean) ?? false,
        options: dto.options as object | undefined,
        numberFormat: dto.numberFormat as string | undefined,
        position: (dto.position as number) ?? 0,
        parentId: dto.parentId as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteAttribute(id: string, actor: RequestUser) {
    await this.prisma.customerAttribute.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Attribute deleted' };
  }

  async listExtraInfos(customerId: string) {
    return this.prisma.customerExtraInfo.findMany({
      where: { customerId },
      include: { attributeDef: true },
    });
  }

  async listCareAfterVisit(tenantId: string, customerId?: string, page = 1, limit = 20) {
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (customerId) where.customerId = customerId;
    const [rows, total] = await Promise.all([
      this.prisma.customerScheduler.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { scheduledAt: 'desc' },
      }),
      this.prisma.customerScheduler.count({ where }),
    ]);
    const data = rows.map((s) => ({
      ...s,
      date: s.scheduledAt,
      employeeId: s.iamEmployeeId,
      processName: s.title,
    }));
    return buildPagedResult(data, total, page, limit);
  }

  async getMedicalRecord(tenantId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: {
        extraInfos: { include: { attributeDef: { select: { fieldName: true } } } },
      },
    });
    if (!customer) return null;
    const extra: Record<string, unknown> = {};
    for (const ei of customer.extraInfos ?? []) {
      extra[ei.attributeDef.fieldName] = ei.value;
    }
    return {
      customerId: customer.id,
      customerName: customer.name,
      medicalHistory: (extra['medicalHistory'] as string) ?? '',
      currentDiagnosis: (extra['currentDiagnosis'] as string) ?? '',
      skinType: (extra['skinType'] as string) ?? '',
      ...extra,
    };
  }
}
