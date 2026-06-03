import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { RequestUser } from '../../../shared/guards/jwt.strategy';
import { buildPagedResult, parsePage, parseLimit } from '../../../shared/kernel/pagination';

@Injectable()
export class BoughtService {
  constructor(private prisma: PrismaService) {}

  // ── BoughtCardService ──────────────────────────────────────────────────────

  async listBoughtCardServices(tenantId: string, query?: {
    customerId?: string; keyword?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.keyword) where.serviceName = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.boughtCardService.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.boughtCardService.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async listByCustomerId(customerId: string, tenantId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.boughtCardService.findMany({
        where: { customerId, tenantId, deletedAt: null },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.boughtCardService.count({ where: { customerId, tenantId, deletedAt: null } }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async upsertBoughtCardService(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.boughtCardService.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.boughtCardService.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId as string,
        boughtCardId: dto.boughtCardId as string | undefined,
        serviceName: dto.serviceName as string,
        serviceCode: dto.serviceCode as string | undefined,
        quantity: (dto.quantity as number) ?? 1,
        price: dto.price as unknown as undefined,
        expiredAt: dto.expiredAt ? new Date(dto.expiredAt as string) : undefined,
        status: (dto.status as string) ?? 'active',
        note: dto.note as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteBoughtCardService(id: string, actor: RequestUser) {
    await this.prisma.boughtCardService.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BoughtCardService deleted' };
  }

  async updateCardNumber(id: string, cardNumber: string, actor: RequestUser) {
    const bc = await this.prisma.boughtCard.findFirst({ where: { id } });
    if (!bc) throw new NotFoundException('BoughtCard', id);
    return this.prisma.boughtCard.update({
      where: { id },
      data: { cardNumber, updatedBy: actor.id },
    });
  }

  async updateCustomerCard(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.boughtCard.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.boughtCard.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId as string,
        cardId: dto.cardId as string | undefined,
        cardNumber: dto.cardNumber as string | undefined,
        status: (dto.status as string) ?? 'active',
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  // ── LoyaltyPointLedger ─────────────────────────────────────────────────────

  async listLoyaltyPoints(tenantId: string, query?: {
    customerId?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId };
    if (query?.customerId) where.customerId = query.customerId;

    const [data, total] = await Promise.all([
      this.prisma.loyaltyPointLedger.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.loyaltyPointLedger.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  // ── BoughtProduct ──────────────────────────────────────────────────────────

  async listBoughtProducts(tenantId: string, query?: {
    customerId?: string; keyword?: string; page?: number; limit?: number;
  }) {
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const where: Record<string, unknown> = { tenantId, deletedAt: null };
    if (query?.customerId) where.customerId = query.customerId;
    if (query?.keyword) where.productName = { contains: query.keyword, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.boughtProduct.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.boughtProduct.count({ where }),
    ]);
    return buildPagedResult(data, total, page, limit);
  }

  async getBoughtProduct(id: string) {
    const p = await this.prisma.boughtProduct.findUnique({ where: { id } });
    if (!p) throw new NotFoundException('BoughtProduct', id);
    return p;
  }

  async listBoughtProductsByCustomer(customerId: string) {
    return this.prisma.boughtProduct.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertBoughtProduct(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.boughtProduct.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.boughtProduct.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId as string,
        productName: dto.productName as string,
        productCode: dto.productCode as string | undefined,
        quantity: (dto.quantity as number) ?? 1,
        price: dto.price as unknown as undefined,
        totalAmount: dto.totalAmount as unknown as undefined,
        invoiceCode: dto.invoiceCode as string | undefined,
        status: (dto.status as string) ?? 'active',
        note: dto.note as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteBoughtProduct(id: string, actor: RequestUser) {
    await this.prisma.boughtProduct.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BoughtProduct deleted' };
  }

  // ── BoughtService ──────────────────────────────────────────────────────────

  async listBoughtServicesByCustomer(customerId: string) {
    return this.prisma.boughtService.findMany({
      where: { customerId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getBoughtService(id: string) {
    const s = await this.prisma.boughtService.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('BoughtService', id);
    return s;
  }

  async upsertBoughtService(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.boughtService.update({
        where: { id },
        data: { ...(dto as object), id: undefined, updatedBy: actor.id } as any,
      });
    }
    return this.prisma.boughtService.create({
      data: {
        tenantId: actor.tenantId,
        customerId: dto.customerId as string,
        serviceName: dto.serviceName as string,
        serviceCode: dto.serviceCode as string | undefined,
        quantity: (dto.quantity as number) ?? 1,
        price: dto.price as unknown as undefined,
        totalAmount: dto.totalAmount as unknown as undefined,
        invoiceCode: dto.invoiceCode as string | undefined,
        status: (dto.status as string) ?? 'active',
        note: dto.note as string | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteBoughtService(id: string, actor: RequestUser) {
    await this.prisma.boughtService.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'BoughtService deleted' };
  }
}
