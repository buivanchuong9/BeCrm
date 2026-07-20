import { Injectable } from '@nestjs/common';
import { Prisma, WorkflowTemplate, WorkflowTemplateVersion } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class WorkflowTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.WorkflowTemplateUncheckedCreateInput,
  ): Promise<WorkflowTemplate> {
    return tx.workflowTemplate.create({ data });
  }

  findById(id: string): Promise<WorkflowTemplate | null> {
    return this.prisma.workflowTemplate.findUnique({ where: { id } });
  }

  list(organizationId: string, specialty?: string): Promise<WorkflowTemplate[]> {
    return this.prisma.workflowTemplate.findMany({
      where: { organizationId, ...(specialty ? { specialty } : {}) },
      orderBy: { updatedAt: 'desc' },
    });
  }

  update(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    data: Prisma.WorkflowTemplateUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return tx.workflowTemplate.updateMany({
      where: { id, version: expectedVersion },
      data: { ...data, version: { increment: 1 } },
    });
  }

  setLatestPublishedVersion(
    tx: Prisma.TransactionClient,
    templateId: string,
    versionId: string,
  ): Promise<WorkflowTemplate> {
    return tx.workflowTemplate.update({
      where: { id: templateId },
      data: { latestPublishedVersionId: versionId },
    });
  }

  /** Best-matching published template for a specialty — fuzzy substring
   * match (confirmed frontend `recommendTemplate` behavior), most-recently
   * published wins. */
  async recommend(organizationId: string, specialty: string): Promise<WorkflowTemplate | null> {
    const normalized = specialty
      .trim()
      .toLowerCase()
      .replace(/^khoa\s+/, '');
    const templates = await this.prisma.workflowTemplate.findMany({
      where: { organizationId, latestPublishedVersionId: { not: null } },
    });
    const matches = templates.filter((t) => {
      const candidate = t.specialty
        .trim()
        .toLowerCase()
        .replace(/^khoa\s+/, '');
      return (
        candidate === normalized || candidate.includes(normalized) || normalized.includes(candidate)
      );
    });
    if (matches.length === 0) return null;
    const withVersions = await Promise.all(
      matches.map(async (t) => ({
        template: t,
        version: t.latestPublishedVersionId
          ? await this.prisma.workflowTemplateVersion.findUnique({
              where: { id: t.latestPublishedVersionId },
            })
          : null,
      })),
    );
    withVersions.sort(
      (a, b) => (b.version?.publishedAt?.getTime() ?? 0) - (a.version?.publishedAt?.getTime() ?? 0),
    );
    return withVersions[0]?.template ?? null;
  }

  createVersion(
    tx: Prisma.TransactionClient,
    data: Prisma.WorkflowTemplateVersionUncheckedCreateInput,
  ): Promise<WorkflowTemplateVersion> {
    return tx.workflowTemplateVersion.create({ data });
  }

  findVersionById(id: string): Promise<WorkflowTemplateVersion | null> {
    return this.prisma.workflowTemplateVersion.findUnique({ where: { id } });
  }

  listVersions(templateId: string): Promise<WorkflowTemplateVersion[]> {
    return this.prisma.workflowTemplateVersion.findMany({
      where: { templateId },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async nextVersionNumber(templateId: string): Promise<number> {
    const latest = await this.prisma.workflowTemplateVersion.findFirst({
      where: { templateId },
      orderBy: { versionNumber: 'desc' },
    });
    return (latest?.versionNumber ?? 0) + 1;
  }

  updateVersion(
    tx: Prisma.TransactionClient,
    id: string,
    expectedRowVersion: number,
    data: Prisma.WorkflowTemplateVersionUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return tx.workflowTemplateVersion.updateMany({
      where: { id, rowVersion: expectedRowVersion },
      data: { ...data, rowVersion: { increment: 1 } },
    });
  }
}
