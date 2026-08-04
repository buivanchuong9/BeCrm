import { Injectable } from '@nestjs/common';
import { EventEmitter } from 'events';
import { AuthenticatedPrincipal } from '../security/auth.types';

export interface SkinAnalysisCaseCreatedEvent {
  principal: AuthenticatedPrincipal;
  patientId: string;
  organizationId: string;
  bodyRegion: string;
  symptoms: string[];
  caseId: string;
  closeup: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  };
  context: {
    requestId?: string;
    ip?: string;
    userAgent?: string;
  };
}

export const DOMAIN_EVENTS = {
  SKIN_ANALYSIS_CASE_CREATED: 'skin_analysis_case.created',
} as const;

interface DomainEventMap {
  [DOMAIN_EVENTS.SKIN_ANALYSIS_CASE_CREATED]: SkinAnalysisCaseCreatedEvent;
}

/**
 * A minimal, in-process, typed event bus — deliberately not the
 * @nestjs/event-emitter package (not a dependency here) or BullMQ (used
 * elsewhere for durable/scheduled work, which this doesn't need).
 *
 * Exists specifically to let ai-assessment and lesion-tracking react to each
 * other without either module importing the other: lesion-tracking already
 * imports ai-assessment (RealImageAnalysisAdapter calls
 * SkinAnalysisCaseService.runCaseAnalysis directly, a synchronous call that
 * needs a return value). Making ai-assessment import lesion-tracking back —
 * even via forwardRef() — closes that into a cycle the project's
 * `no-circular` architecture rule (dependency-cruiser) forbids. Emitting an
 * event here needs no import of the listener's module at all.
 *
 * Fire-and-forget by design: a listener failure must never surface back to
 * the emitter or fail its request. There is no persistence — an event raised
 * right before a process crash is simply lost, which is acceptable for the
 * one thing this currently carries (auto-tracking a lesion baseline from a
 * screening submission is a convenience side effect, not part of the
 * screening's contract).
 */
@Injectable()
export class DomainEventsService {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Side-effect listeners are expected to handle their own errors; this
    // only stops an unhandled listener rejection from crashing the process.
    this.emitter.on('error', () => undefined);
  }

  emit<K extends keyof DomainEventMap>(event: K, payload: DomainEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  on<K extends keyof DomainEventMap>(
    event: K,
    listener: (payload: DomainEventMap[K]) => void,
  ): void {
    this.emitter.on(event, listener);
  }
}
