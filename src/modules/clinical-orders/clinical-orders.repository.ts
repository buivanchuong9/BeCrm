import { Injectable } from '@nestjs/common';
import { ClinicalOrder, ClinicalResult, Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class ClinicalOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.ClinicalOrderUncheckedCreateInput,
  ): Promise<ClinicalOrder> {
    return tx.clinicalOrder.create({ data });
  }

  findById(id: string): Promise<ClinicalOrder | null> {
    return this.prisma.clinicalOrder.findUnique({ where: { id } });
  }

  listForEncounter(encounterId: string): Promise<ClinicalOrder[]> {
    return this.prisma.clinicalOrder.findMany({
      where: { encounterId },
      orderBy: { createdAt: 'desc' },
    });
  }

  update(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    data: Prisma.ClinicalOrderUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return tx.clinicalOrder.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  createResult(
    tx: Prisma.TransactionClient,
    data: Prisma.ClinicalResultUncheckedCreateInput,
  ): Promise<ClinicalResult> {
    return tx.clinicalResult.create({ data });
  }

  findResultByOrderId(orderId: string): Promise<ClinicalResult | null> {
    return this.prisma.clinicalResult.findUnique({ where: { orderId } });
  }
}
