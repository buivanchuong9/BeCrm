import { Injectable } from '@nestjs/common';
import { Prisma, QueueTicket, QueueTicketStatus } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

const LIVE_STATUSES: QueueTicketStatus[] = ['waiting', 'called', 'acknowledged', 'in_service'];

@Injectable()
export class QueueTicketsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findById(id: string): Promise<QueueTicket | null> {
    return this.prisma.queueTicket.findUnique({ where: { id } });
  }

  findLiveByAppointmentId(appointmentId: string): Promise<QueueTicket | null> {
    return this.prisma.queueTicket.findFirst({
      where: { appointmentId, status: { in: LIVE_STATUSES } },
    });
  }

  list(params: {
    organizationId: string;
    clinicLocationId: string;
    department?: string;
    status?: QueueTicketStatus;
    serviceStation?: string;
  }): Promise<QueueTicket[]> {
    // Fixed ordering (urgent > priority > normal, then issuedAt, then id) —
    // never client-choosable (docs/api.md section 11's documented exception
    // for this endpoint, section 41 queue determinism requirement).
    return this.prisma.queueTicket.findMany({
      where: {
        organizationId: params.organizationId,
        clinicLocationId: params.clinicLocationId,
        ...(params.department ? { department: params.department } : {}),
        ...(params.status ? { status: params.status } : {}),
        ...(params.serviceStation ? { serviceStation: params.serviceStation } : {}),
      },
      // PostgreSQL preserves the enum declaration order
      // normal < priority < urgent, so descending produces the contract order.
      orderBy: [{ priority: 'desc' }, { issuedAt: 'asc' }, { id: 'asc' }],
    });
  }

  async stationSummary(
    organizationId: string,
    clinicLocationId: string,
  ): Promise<{ serviceStation: string; waiting: number; called: number; inService: number }[]> {
    const rows = await this.prisma.queueTicket.groupBy({
      by: ['serviceStation', 'status'],
      where: {
        organizationId,
        clinicLocationId,
        status: { in: LIVE_STATUSES },
      },
      _count: { _all: true },
    });
    const byStation = new Map<string, { waiting: number; called: number; inService: number }>();
    for (const row of rows) {
      const entry = byStation.get(row.serviceStation) ?? { waiting: 0, called: 0, inService: 0 };
      if (row.status === 'waiting') entry.waiting += row._count._all;
      else if (row.status === 'called' || row.status === 'acknowledged')
        entry.called += row._count._all;
      else if (row.status === 'in_service') entry.inService += row._count._all;
      byStation.set(row.serviceStation, entry);
    }
    return [...byStation.entries()].map(([serviceStation, counts]) => ({
      serviceStation,
      ...counts,
    }));
  }

  async countWaitingAhead(
    organizationId: string,
    clinicLocationId: string,
    department: string,
  ): Promise<number> {
    return this.prisma.queueTicket.count({
      where: {
        organizationId,
        clinicLocationId,
        department,
        status: { in: ['waiting', 'called', 'acknowledged', 'in_service'] },
      },
    });
  }

  create(
    tx: Prisma.TransactionClient,
    data: Prisma.QueueTicketUncheckedCreateInput,
  ): Promise<QueueTicket> {
    return tx.queueTicket.create({ data });
  }

  /** Row-locks and claims the highest-priority waiting ticket in one
   * statement so two concurrent `call-next` requests can never select the
   * same ticket (docs/api.md section 41 "Queue call-next"). Returns null if
   * nothing is waiting. */
  async callNext(
    tx: Prisma.TransactionClient,
    organizationId: string,
    clinicLocationId: string,
    department: string,
  ): Promise<QueueTicket | null> {
    const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT id FROM queue_tickets
      WHERE organization_id = ${organizationId}::uuid
        AND clinic_location_id = ${clinicLocationId}::uuid
        AND department = ${department}
        AND status = 'waiting'
      ORDER BY
        CASE priority WHEN 'urgent' THEN 0 WHEN 'priority' THEN 1 ELSE 2 END,
        issued_at ASC,
        id ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    `);
    const ticketId = rows[0]?.id;
    if (!ticketId) return null;
    return tx.queueTicket.update({
      where: { id: ticketId },
      data: { status: 'called', calledAt: new Date(), version: { increment: 1 } },
    });
  }

  transition(
    tx: Prisma.TransactionClient,
    id: string,
    expectedVersion: number,
    fromStatuses: QueueTicketStatus[],
    data: Prisma.QueueTicketUpdateManyMutationInput,
  ): Promise<Prisma.BatchPayload> {
    return tx.queueTicket.updateMany({
      where: { id, version: expectedVersion, status: { in: fromStatuses } },
      data: { ...data, version: { increment: 1 } },
    });
  }
}
