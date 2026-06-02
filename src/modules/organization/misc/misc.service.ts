import { Injectable } from '@nestjs/common';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class MiscService {
  async list(resource: string, tenantId: string, query: Record<string, string>) {
    return { data: [], total: 0, page: Number(query.page ?? 1), limit: Number(query.limit ?? 20) };
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

  async delete(resource: string, id: string, actor: RequestUser) {
    return { message: 'Deleted' };
  }
}
