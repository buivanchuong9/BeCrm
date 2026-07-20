export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta: Record<string, unknown>;
  requestId: string;
}

export interface ErrorEnvelope {
  success: false;
  code: string;
  message: string;
  errors: Record<string, string>;
  requestId: string;
}
