import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { NotFoundException } from '../../../shared/exceptions/domain.exception';
import { BpmEngineService } from '../instance/bpm-engine.service';
import { RequestUser } from '../../../shared/guards/jwt.strategy';

@Injectable()
export class BpmApprovalService {
  constructor(
    private prisma: PrismaService,
    private engine: BpmEngineService,
  ) {}

  async listDefinitions(tenantId: string) {
    return this.prisma.bpmApprovalDefinition.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async upsertDefinition(dto: Record<string, unknown>, actor: RequestUser) {
    const id = dto.id as string | undefined;
    if (id) {
      return this.prisma.bpmApprovalDefinition.update({
        where: { id },
        data: {
          name: dto.name as string | undefined,
          code: dto.code as string | undefined,
          approvalType: dto.approvalType as string | undefined,
          config: dto.config as object | undefined,
          isActive: dto.isActive as boolean | undefined,
          rowVersion: { increment: 1 },
          updatedBy: actor.id,
        },
      });
    }
    return this.prisma.bpmApprovalDefinition.create({
      data: {
        tenantId: actor.tenantId,
        name: dto.name as string,
        code: dto.code as string | undefined,
        approvalType: (dto.approvalType as string) ?? 'sequential',
        config: dto.config as object | undefined,
        createdBy: actor.id,
        updatedBy: actor.id,
      },
    });
  }

  async deleteDefinition(id: string, actor: RequestUser) {
    await this.prisma.bpmApprovalDefinition.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: actor.id },
    });
    return { message: 'Approval definition deleted' };
  }

  async listApprovals(tenantId: string, query?: { workOrderId?: string; definitionId?: string; status?: string }) {
    return this.prisma.bpmApproval.findMany({
      where: {
        tenantId,
        ...(query?.workOrderId ? { workOrderId: query.workOrderId } : {}),
        ...(query?.definitionId ? { definitionId: query.definitionId } : {}),
        ...(query?.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      include: { definition: true },
    });
  }

  async approve(id: string, comment: string | undefined, actor: RequestUser) {
    const approval = await this.prisma.bpmApproval.findUnique({ where: { id } });
    if (!approval || approval.tenantId !== actor.tenantId) throw new NotFoundException('BpmApproval', id);

    await this.prisma.bpmApproval.update({
      where: { id },
      data: {
        status: 'approved',
        comment,
        approvedAt: new Date(),
        updatedBy: actor.id,
      },
    });

    // If this approval is linked to a token, complete that token
    // TODO(UNKNOWN): link approval to task token for auto-advance

    return { message: 'Approved' };
  }

  async reject(id: string, comment: string | undefined, actor: RequestUser) {
    const approval = await this.prisma.bpmApproval.findUnique({ where: { id } });
    if (!approval || approval.tenantId !== actor.tenantId) throw new NotFoundException('BpmApproval', id);

    await this.prisma.bpmApproval.update({
      where: { id },
      data: { status: 'rejected', comment, approvedAt: new Date(), updatedBy: actor.id },
    });

    return { message: 'Rejected' };
  }
}
