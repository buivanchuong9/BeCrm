import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class MiscService {
  constructor(private prisma: PrismaService) {}

  async list(resource: string, tenantId: string, query: Record<string, string>) {
    const page = parsePage(query.page);
    const limit = parseLimit(query.limit);
    // Generic stub — returns empty list in correct paginated format
    return buildPagedResult([], 0, page, limit);
  }

  async getCustomerClassify(tenantId: string, kind: string) {
    return { tenantId, kind, data: [] };
  }

  async listObjectAttributes(tenantId: string, objectType: string) {
    return { tenantId, objectType, data: [] };
  }

  async upsertObjectAttribute(tenantId: string, objectType: string, dto: Record<string, unknown>, actor: RequestUser) {
    return { ...dto, id: (dto.id as string) ?? 'stub', tenantId, objectType };
  }

  async deleteObjectAttribute(id: string, actor: RequestUser) {
    return { message: 'Deleted' };
  }

  async getById(resource: string, id: string) {
    return { id, resource };
  }

  async upsert(resource: string, dto: Record<string, unknown>, actor: RequestUser) {
    return { ...dto, id: (dto.id as string) ?? 'stub', resource };
  }

  async updateCommunicationRequestStatus(
    resource: 'smsRequest' | 'emailRequest',
    dto: Record<string, unknown>,
    status: 'approved' | 'cancelled',
    actor: RequestUser,
  ) {
    const id = (dto.id as string) ?? `stub-${Date.now()}`;
    return {
      ...dto,
      id,
      resource,
      status,
      updatedBy: actor.id,
      updatedAt: new Date().toISOString(),
    };
  }

  async delete(resource: string, id: string, actor: RequestUser) {
    return { message: 'Deleted' };
  }

  // ── Relationship = ContactPipeline from CRM schema ────────────────────────
  async listRelationships(tenantId: string) {
    return this.prisma.contactPipeline.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        statuses: {
          where: { deletedAt: null },
          orderBy: { position: 'asc' },
          select: { id: true, name: true, colorHex: true, position: true },
        },
      },
      orderBy: { position: 'asc' },
    });
  }

  // ── BeautySalon domain lookup ─────────────────────────────────────────────
  async getBeautySalonByDomain(domain: string, tenantId?: string) {
    const salon = tenantId
      ? await this.prisma.beautySalon.findFirst({ where: { tenantId, deletedAt: null } })
      : null;
    return {
      isBeauty: true,
      logo: '',
      logoTransparent: '',
      ...(salon ?? {}),
    };
  }
}
