import { completeLoginHandoff } from "../services/login-handoff.server";
import { getIdentityService } from "../services/identity-runtime.server";

/** Top-level navigation turns a short-lived, one-use handoff into an HttpOnly session cookie. */
export async function loader({ request }: { request: Request }) {
  try {
    return await completeLoginHandoff(request, getIdentityService());
  } catch {
    return new Response("This sign-in link has expired. Please return to Fashionpur and try again.", { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
