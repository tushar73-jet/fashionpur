import { getIdentityService } from "../services/identity-runtime.server";
import { verifyMsg91WidgetAccessToken } from "../services/msg91-widget.server";
import { loginHandoffUrl, safeStorefrontReturnPath } from "../services/login-handoff.server";
import { otpCorrelationId, otpDiagnostic, otpFailureCategory } from "../services/otp-diagnostics.server";
import { isAllowedStorefrontOrigin, options, response } from "../services/storefront-api.server";

export async function loader({ request }: { request: Request }) {
  if (request.method === "OPTIONS") return options(request);
  return response(request, { error: "Method not allowed." }, 405);
}

/** Completes login only after MSG91 has verified the Widget access token server-side. */
export async function action({ request }: { request: Request }) {
  if (request.method === "OPTIONS") return options(request);
  if (!isAllowedStorefrontOrigin(request)) return response(request, { error: "Storefront origin is not allowed." }, 403);
  const correlationId = otpCorrelationId(request);
  otpDiagnostic("otp.widget.verify.started", correlationId);
  try {
    const body = await request.json() as { accessToken?: string; consent?: boolean; locale?: string; cartToken?: string; cartClaimSecret?: string; returnPath?: string };
    const phone = await verifyMsg91WidgetAccessToken(body.accessToken ?? "", process.env, fetch, correlationId);
    const service = getIdentityService();
    const customer = await service.completeVerifiedPhone(phone, body.consent === true, body.locale ?? null);
    await service.claimCart(customer.id, body.cartToken ?? null, body.cartClaimSecret ?? null);
    const handoff = await service.createLoginHandoff(customer.id, safeStorefrontReturnPath(body.returnPath));
    otpDiagnostic("otp.widget.verify.succeeded", correlationId);
    return response(request, { handoffUrl: loginHandoffUrl(handoff.code) });
  } catch (error) {
    otpDiagnostic("otp.widget.verify.failed", correlationId, { category: otpFailureCategory(error) });
    return response(request, { error: error instanceof Error ? error.message : "Unable to verify code." }, 400);
  }
}
