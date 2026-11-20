import { randomUUID } from "node:crypto";
import { commitCustomerSession, noStoreHeaders } from "./customer-session.server";
import type { IdentityGateway } from "./identity.server";

/** Only accept a relative path; full URLs and protocol-relative URLs are open redirects. */
export function safeStorefrontReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}

export function storefrontRedirect(returnPath: string): string {
  const origin = process.env.STOREFRONT_ORIGIN;
  if (!origin) throw new Error("STOREFRONT_ORIGIN is required for a customer login handoff.");
  const parsed = new URL(origin);
  if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("STOREFRONT_ORIGIN must use HTTPS in production.");
  }
  return new URL(safeStorefrontReturnPath(returnPath), parsed).toString();
}

export function loginHandoffUrl(code: string): string {
  const accountOrigin = process.env.CUSTOMER_ACCOUNT_URL || process.env.SHOPIFY_APP_URL;
  if (!accountOrigin) throw new Error("CUSTOMER_ACCOUNT_URL is required for a customer login handoff.");
  const url = new URL(accountOrigin);
  if (url.protocol !== "https:" && process.env.NODE_ENV === "production") {
    throw new Error("CUSTOMER_ACCOUNT_URL must use HTTPS in production.");
  }
  url.pathname = "/account/complete-login";
  url.search = "";
  url.searchParams.set("code", code);
  return url.toString();
}

export async function completeLoginHandoff(request: Request, service: IdentityGateway) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";
  const { session, returnPath } = await service.consumeLoginHandoff(code);
  const headers = noStoreHeaders();
  headers.append("Set-Cookie", commitCustomerSession(session.token, session.expiresAt));
  headers.set("Location", storefrontRedirect(returnPath));
  headers.set("X-Fashionpur-Login", randomUUID());
  return new Response(null, { status: 302, headers });
}
