import type { IdentityService } from "./identity.server";

const production = process.env.NODE_ENV === "production";
const COOKIE_NAME = production ? "__Host-fashionpur_identity" : "fashionpur_identity_dev";

function cookieValue(request: Request): string | null {
  const raw = request.headers.get("cookie") ?? "";
  const item = raw.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : null;
}

function serialize(token: string, expiresAt: Date) {
  const attributes = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Expires=${expiresAt.toUTCString()}`,
  ];
  if (production) attributes.push("Secure");
  return attributes.join("; ");
}

export function noStoreHeaders(headers = new Headers()) {
  headers.set("Cache-Control", "no-store, max-age=0");
  return headers;
}

export function commitCustomerSession(token: string, expiresAt: Date) {
  return serialize(token, expiresAt);
}

export function destroyCustomerSession() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${production ? "; Secure" : ""}`;
}

export function requireCustomerSession(request: Request, service: IdentityService) {
  const session = service.getSession(cookieValue(request));
  if (!session) throw new Response("Unauthorized", { status: 401, headers: noStoreHeaders() });
  return session;
}

export function sessionTokenFromRequest(request: Request) {
  return cookieValue(request);
}

export function assertCsrf(actual: string | null, expected: string) {
  if (!actual || actual !== expected) throw new Response("Invalid request", { status: 403, headers: noStoreHeaders() });
}
