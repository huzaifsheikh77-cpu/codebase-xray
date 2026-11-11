import { randomUUID } from "node:crypto";

/** Safe request identifier: platform header when present, otherwise random. */
export function requestIdFrom(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  if (supplied && /^[A-Za-z0-9._-]{8,128}$/.test(supplied)) return supplied;
  return randomUUID();
}

/**
 * Structured, low-volume operational event. Never pass tokens, keys, source
 * contents, repository descriptions or raw error messages here.
 */
export function logEvent(event: {
  event: string;
  requestId: string;
  route: string;
  outcome: string;
  durationMs?: number;
  failureCategory?: string;
  githubQuotaLow?: boolean;
  aiFailure?: boolean;
  partial?: boolean;
  inspectedFiles?: number;
}): void {
  console.info(JSON.stringify({ ts: new Date().toISOString(), ...event }));
}
