export interface SuccessEnvelope<T> {
  data: T;
  meta: Record<string, unknown>;
  requestId: string;
}

export interface ErrorEnvelopeBody {
  code: string;
  message: string;
  details: Array<{ field?: string; code: string; message?: string }>;
  requestId: string;
}

export interface ErrorEnvelope {
  error: ErrorEnvelopeBody;
}
