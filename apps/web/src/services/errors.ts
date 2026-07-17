import { AxiosError } from "axios";

/**
 * Normalized transport error. Every service rejects with an `AppError`, so callers (server
 * actions, thunks, hooks) branch on a stable shape instead of poking at raw Axios internals.
 * This is transport normalization, NOT domain logic — the API remains the authority on what
 * an error *means*.
 */
export class AppError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 for network/timeout failures with no response. */
    readonly status: number,
    /** Machine-readable code from the API body when present. */
    readonly code?: string,
    /** Field-level validation details from the API, if any. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  /** No HTTP response came back (offline, DNS, timeout, CORS). */
  get isNetwork(): boolean {
    return this.status === 0;
  }
}

interface ApiErrorBody {
  message?: string | string[];
  code?: string;
  details?: unknown;
}

export function toAppError(error: AxiosError): AppError {
  const res = error.response;
  if (!res) {
    return new AppError(error.message || "Network error", 0);
  }
  const body = (res.data ?? {}) as ApiErrorBody;
  const message = Array.isArray(body.message)
    ? body.message.join(", ")
    : body.message || error.message || `Request failed (${res.status})`;
  return new AppError(message, res.status, body.code, body.details);
}
