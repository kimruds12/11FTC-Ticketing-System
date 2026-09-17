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
  message?: string | unknown[] | Record<string, unknown>;
  code?: string;
  details?: unknown;
}

function formatErrorMessageItem(item: unknown): string {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    if (typeof obj.message === "string") {
      return obj.path ? `${String(obj.path)}: ${obj.message}` : obj.message;
    }
    try {
      return JSON.stringify(item);
    } catch {
      return String(item);
    }
  }
  return String(item);
}

export function toAppError(error: AxiosError): AppError {
  const res = error.response;
  if (!res) {
    return new AppError(error.message || "Network error", 0);
  }
  const body = (res.data ?? {}) as ApiErrorBody;
  let message: string;
  if (Array.isArray(body.message)) {
    message = body.message.map(formatErrorMessageItem).filter(Boolean).join(", ");
  } else if (body.message && typeof body.message === "object") {
    message = formatErrorMessageItem(body.message);
  } else if (typeof body.message === "string") {
    message = body.message;
  } else {
    message = error.message || `Request failed (${res.status})`;
  }
  return new AppError(message || `Request failed (${res.status})`, res.status, body.code, body.details);
}
