import { QueueTicket } from '@prisma/client';
import { QueueTicketResponseDto } from './dto/responses/queue-ticket-response.dto';

export function toQueueTicketResponse(
  ticket: QueueTicket,
  derived: { peopleAhead: number; estimatedWaitMinutes: number },
): QueueTicketResponseDto {
  return {
    id: ticket.id,
    appointmentId: ticket.appointmentId,
    patientId: ticket.patientId,
    encounterId: ticket.encounterId,
    checkInId: ticket.checkInId,
    sourceType: ticket.sourceType,
    clinicDate: ticket.clinicDate.toISOString().split('T')[0],
    number: ticket.number,
    department: ticket.department,
    serviceStation: ticket.serviceStation,
    room: ticket.room,
    waitingArea: ticket.waitingArea,
    priority: ticket.priority,
    status: ticket.status,
    issuedAt: ticket.issuedAt.toISOString(),
    calledAt: ticket.calledAt?.toISOString() ?? null,
    acknowledgedAt: ticket.acknowledgedAt?.toISOString() ?? null,
    serviceStartedAt: ticket.serviceStartedAt?.toISOString() ?? null,
    completedAt: ticket.completedAt?.toISOString() ?? null,
    skippedAt: ticket.skippedAt?.toISOString() ?? null,
    cancelledAt: ticket.cancelledAt?.toISOString() ?? null,
    noShowAt: ticket.noShowAt?.toISOString() ?? null,
    peopleAhead: derived.peopleAhead,
    estimatedWaitMinutes: derived.estimatedWaitMinutes,
    // No confirmed per-department prep-instruction source exists yet —
    // never fabricated, always empty until a real content source is scoped.
    preparationInstructions: [],
    nextStation: ticket.nextStation,
    version: ticket.version,
  };
}
