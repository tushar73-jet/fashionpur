import { commitCustomerSession, destroyCustomerSession, noStoreHeaders, requireCustomerSession, sessionTokenFromRequest } from "./customer-session.server";
import type { IdentityGateway } from "./identity.server";

function headers(request: Request) {
  const result = noStoreHeaders();
  const allowed = process.env.STOREFRONT_ORIGIN;
  if (allowed && request.headers.get("origin") === allowed) { result.set("Access-Control-Allow-Origin", allowed); result.set("Access-Control-Allow-Credentials", "true"); result.set("Vary", "Origin"); }
  return result;
}
export function options(request: Request) { const result = headers(request); result.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS"); result.set("Access-Control-Allow-Headers", "content-type, x-fashionpur-csrf"); return new Response(null, { status: 204, headers: result }); }
export function response(request: Request, data: unknown, status = 200, extra?: Headers) { const result = headers(request); result.set("content-type", "application/json"); extra?.forEach((value, key) => result.append(key, value)); return new Response(JSON.stringify(data), { status, headers: result }); }
export { commitCustomerSession, destroyCustomerSession, requireCustomerSession, sessionTokenFromRequest, type IdentityGateway };
