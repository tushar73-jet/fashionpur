import crypto from "node:crypto";

export function otpCorrelationId(request: Request) {
  const supplied = request.headers.get("x-fashionpur-attempt");
  return supplied && /^[A-Za-z0-9_-]{12,128}$/.test(supplied) ? supplied : crypto.randomUUID();
}

/** Logs only request-stage metadata: never OTPs, access tokens, or phone numbers. */
export function otpDiagnostic(event: string, correlationId: string, metadata: Record<string, string | number | boolean | null> = {}) {
  console.info(JSON.stringify({ event, correlationId, ...metadata }));
}

export function otpFailureCategory(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/MSG91 could not validate/i.test(message)) return "provider_rejected";
  if (/origin/i.test(message)) return "origin_rejected";
  if (/login link/i.test(message)) return "handoff_rejected";
  return "application_rejected";
}
