import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

/**
 * The upload relation is intentionally loaded only so the application service
 * can create short-lived download URLs. Mappers never expose storageKey.
 */
export const OBSERVATION_INCLUDE = Prisma.validator<Prisma.LesionObservationInclude>()({
  imageAssets: {
    include: {
      upload: {
        select: {
          id: true,
          storageKey: true,
          status: true,
          expiresAt: true,
          confirmedAt: true,
        },
      },
    },
    orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
  },
  metrics: {
    orderBy: [{ observedAt: 'asc' }, { code: 'asc' }],
  },
});

export type ObservationRecord = Prisma.LesionObservationGetPayload<{
  include: typeof OBSERVATION_INCLUDE;
}>;

export const COMPARISON_INCLUDE = Prisma.validator<Prisma.LesionComparisonSessionInclude>()({
  analysis: {
    include: {
      metrics: {
        orderBy: { key: 'asc' },
      },
    },
  },
  reviews: {
    orderBy: [{ reviewedAt: 'asc' }, { id: 'asc' }],
  },
});

export type ComparisonRecord = Prisma.LesionComparisonSessionGetPayload<{
  include: typeof COMPARISON_INCLUDE;
}>;

export const LESION_DETAIL_INCLUDE = Prisma.validator<Prisma.LesionInclude>()({
  observations: {
    include: OBSERVATION_INCLUDE,
    orderBy: [{ capturedAt: 'asc' }, { id: 'asc' }],
  },
  comparisons: {
    include: COMPARISON_INCLUDE,
    orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
    take: 1,
  },
});

export type LesionDetailRecord = Prisma.LesionGetPayload<{
  include: typeof LESION_DETAIL_INCLUDE;
}>;

export interface CursorPage<T> {
  rows: T[];
  nextCursor: string | null;
}

function cursorPage<T extends { id: string }>(rows: T[], limit: number): CursorPage<T> {
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  return {
    rows: pageRows,
    nextCursor: hasMore ? (pageRows.at(-1)?.id ?? null) : null,
  };
}

@Injectable()
export class LesionTrackingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listLesions(
    patientId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CursorPage<Prisma.LesionGetPayload<Record<string, never>>>> {
    const rows = await this.prisma.lesion.findMany({
      where: { patientId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    return cursorPage(rows, limit);
  }

  findLesionAccess(lesionId: string) {
    return this.prisma.lesion.findUnique({
      where: { id: lesionId },
      select: {
        id: true,
        patientId: true,
        organizationId: true,
        responsibleClinicianId: true,
        status: true,
        patient: {
          select: {
            userId: true,
            primaryDoctorId: true,
          },
        },
      },
    });
  }

  findLesionDetail(lesionId: string): Promise<LesionDetailRecord | null> {
    return this.prisma.lesion.findUnique({
      where: { id: lesionId },
      include: LESION_DETAIL_INCLUDE,
    });
  }

  findObservationAccess(observationId: string) {
    return this.prisma.lesionObservation.findUnique({
      where: { id: observationId },
      select: {
        id: true,
        lesionId: true,
        status: true,
        revision: true,
        lesion: {
          select: {
            patientId: true,
            organizationId: true,
            responsibleClinicianId: true,
          },
        },
      },
    });
  }

  findComparisonAccess(comparisonId: string) {
    return this.prisma.lesionComparisonSession.findUnique({
      where: { id: comparisonId },
      select: {
        id: true,
        lesionId: true,
        status: true,
        requestedById: true,
        lesion: {
          select: {
            patientId: true,
            organizationId: true,
            responsibleClinicianId: true,
          },
        },
      },
    });
  }

  findComparison(comparisonId: string): Promise<ComparisonRecord | null> {
    return this.prisma.lesionComparisonSession.findUnique({
      where: { id: comparisonId },
      include: COMPARISON_INCLUDE,
    });
  }

  async listTimeline(
    lesionId: string,
    cursor: string | undefined,
    limit: number,
  ): Promise<CursorPage<Prisma.LesionTimelineEventGetPayload<Record<string, never>>>> {
    const rows = await this.prisma.lesionTimelineEvent.findMany({
      where: { lesionId },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit + 1,
    });
    return cursorPage(rows, limit);
  }

  /**
   * Audit rows have no direct Lesion relation. Limit them to this patient's
   * lesion-scoped resource ids so unrelated medical-record audit entries do
   * not leak into the DermaTimeline bundle.
   */
  listAudit(patientId: string, resourceIds: string[], limit = 100) {
    if (resourceIds.length === 0) return Promise.resolve([]);
    return this.prisma.auditEvent.findMany({
      where: {
        patientId,
        resourceId: { in: [...new Set(resourceIds)] },
        sourceModule: 'lesion-tracking',
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: Math.min(Math.max(limit, 1), 200),
    });
  }
}
