import { getIdentityService } from "../services/identity-runtime.server";
import { destroyCustomerSession, options, response, sessionTokenFromRequest } from "../services/storefront-api.server";
export async function action({ request }: { request: Request }) { if (request.method === "OPTIONS") return options(request); await getIdentityService().destroySession(sessionTokenFromRequest(request)); const headers = new Headers(); headers.append("Set-Cookie", destroyCustomerSession()); return response(request, { ok: true }, 200, headers); }
