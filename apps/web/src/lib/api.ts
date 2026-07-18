/**
 * src/lib/api.ts — typed fetch wrapper for the NestJS API.
 *
 * Usage:
 *   import { apiFetch } from "@/lib/api";
 *   const tickets = await apiFetch<TicketDto[]>("/tickets?status=OPEN");
 *
 * The JWT is read from Supabase Auth session storage. All requests include
 *   Authorization: Bearer <jwt>
 * per docs/api/README.md.
 *
 * NO business logic here — just a transport wrapper (frontend/README.md).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Read the Supabase session JWT from localStorage (client side).
 * On the server, the JWT must be passed explicitly.
 */
function getJwt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    // Supabase stores session under a key like `sb-<project>-auth-token`
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("sb-") && k.endsWith("-auth-token")
    );
    if (!key) return null;
    const session = JSON.parse(localStorage.getItem(key) ?? "{}");
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { jwt?: string } = {}
): Promise<T> {
  const { jwt: explicitJwt, ...fetchOptions } = options;
  const jwt = explicitJwt ?? getJwt();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (jwt) {
    headers["Authorization"] = `Bearer ${jwt}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers,
  });

  if (!res.ok) {
    let body: unknown;
    try { body = await res.json(); } catch { body = null; }
    throw new ApiError(
      res.status,
      `API error ${res.status}: ${res.statusText}`,
      body
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Convenience aliases */
export const apiGet  = <T>(path: string, jwt?: string) =>
  apiFetch<T>(path, { method: "GET", jwt });

export const apiPost = <T>(path: string, body: unknown, jwt?: string) =>
  apiFetch<T>(path, { method: "POST",  body: JSON.stringify(body), jwt });

export const apiPatch = <T>(path: string, body: unknown, jwt?: string) =>
  apiFetch<T>(path, { method: "PATCH", body: JSON.stringify(body), jwt });
