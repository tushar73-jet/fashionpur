import { getIdentityService } from "../services/identity-runtime.server";
import { options, requireCustomerSession, response } from "../services/storefront-api.server";
const mask = (phone: string) => phone.length < 5 ? "••••" : `${phone.slice(0, 3)}••••${phone.slice(-3)}`;
export async function loader({ request }: { request: Request }) { if (request.method === "OPTIONS") return options(request); try { const { identity } = await requireCustomerSession(request, getIdentityService()); return response(request, { authenticated: true, name: identity.name, maskedPhone: mask(identity.phone) }); } catch { return response(request, { authenticated: false }); } }
