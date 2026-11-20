import { getIdentityService } from "../services/identity-runtime.server";
import { assertCsrf, destroyCustomerSession, requireCustomerSession, sessionTokenFromRequest } from "../services/customer-session.server";
import { options, response } from "../services/storefront-api.server";

/** JSON logout is intentionally CSRF-protected even though the cookie is Lax. */
export async function action({ request }: { request: Request }) {
  if (request.method === "OPTIONS") return options(request);
  try {
    const service = getIdentityService();
    const session = await requireCustomerSession(request, service);
    assertCsrf(request.headers.get("x-fashionpur-csrf"), session.csrfToken);
    await service.destroySession(sessionTokenFromRequest(request));
    const headers = new Headers();
    headers.append("Set-Cookie", destroyCustomerSession());
    return response(request, { ok: true }, 200, headers);
  } catch (error) {
    if (error instanceof Response) return response(request, { error: error.status === 403 ? "Invalid request." : "Unauthorized." }, error.status);
    return response(request, { error: "Unable to log out." }, 400);
  }
}
