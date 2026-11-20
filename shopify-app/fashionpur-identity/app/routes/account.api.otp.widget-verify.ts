import { getIdentityService } from "../services/identity-runtime.server";
import { verifyMsg91WidgetAccessToken } from "../services/msg91-widget.server";
import { commitCustomerSession, options, response } from "../services/storefront-api.server";

export async function loader({ request }: { request: Request }) {
  if (request.method === "OPTIONS") return options(request);
  return response(request, { error: "Method not allowed." }, 405);
}

/** Completes login only after MSG91 has verified the Widget access token server-side. */
export async function action({ request }: { request: Request }) {
  if (request.method === "OPTIONS") return options(request);
  try {
    const body = await request.json() as { accessToken?: string; consent?: boolean; locale?: string; cartToken?: string; cartClaimSecret?: string };
    const phone = await verifyMsg91WidgetAccessToken(body.accessToken ?? "");
    const service = getIdentityService();
    const customer = await service.completeVerifiedPhone(phone, body.consent === true, body.locale ?? null);
    await service.claimCart(customer.id, body.cartToken ?? null, body.cartClaimSecret ?? null);
    const session = await service.createSession(customer.id);
    const headers = new Headers();
    headers.append("Set-Cookie", commitCustomerSession(session.token, session.expiresAt));
    return response(request, { customer: { name: customer.name, phone: customer.phone } }, 200, headers);
  } catch (error) {
    return response(request, { error: error instanceof Error ? error.message : "Unable to verify code." }, 400);
  }
}
