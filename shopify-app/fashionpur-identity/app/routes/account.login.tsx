import { Form, redirect, useActionData, useNavigation, useSearchParams } from "react-router";
import { commitCustomerSession, noStoreHeaders } from "../services/customer-session.server";
import { getIdentityService } from "../services/identity-runtime.server";

function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

type LoginActionData = { stage: "send" | "verify"; phone?: string; requestId?: string; message?: string; error?: string };
function json(data: LoginActionData, init: ResponseInit) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const service = getIdentityService();
  try {
    if (intent === "send") {
      const phone = String(form.get("phone") ?? "");
      const result = await service.startOtp(phone, clientIp(request));
      return json({ stage: "verify" as const, phone, requestId: result.requestId, message: "We sent a verification code." }, { headers: noStoreHeaders() });
    }
    if (intent === "verify") {
      const phone = String(form.get("phone") ?? "");
      const identity = await service.verifyOtp(
        phone,
        String(form.get("requestId") ?? ""),
        String(form.get("code") ?? ""),
        form.get("marketingConsent") === "on",
      );
      await service.claimCart(identity.id, String(form.get("cartToken") ?? "") || null, String(form.get("cartClaimSecret") ?? "") || null);
      const session = await service.createSession(identity.id);
      const headers = noStoreHeaders();
      headers.append("Set-Cookie", commitCustomerSession(session.token, session.expiresAt));
      return redirect("/account/profile", { headers });
    }
    return json({ stage: "send" as const, error: "Unsupported request." }, { status: 400, headers: noStoreHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to continue.";
    return json({ stage: intent === "verify" ? "verify" as const : "send" as const, error: message }, { status: 400, headers: noStoreHeaders() });
  }
}

export default function Login() {
  const [searchParams] = useSearchParams();
  const data = useActionData() as LoginActionData | undefined;
  const navigation = useNavigation();
  const verifying = data?.stage === "verify" && data.requestId && data.phone;
  return (
    <main className="identity-shell">
      <section className="identity-card" aria-labelledby="login-title">
        <p className="identity-kicker">FASHIONPUR</p>
        <h1 id="login-title">Welcome</h1>
        <p>Sign in securely with a one-time code sent by SMS.</p>
        {data?.error ? <p className="identity-error" role="alert">{data.error}</p> : null}
        {verifying ? (
          <Form method="post" className="identity-form">
            <input type="hidden" name="intent" value="verify" />
            <input type="hidden" name="phone" value={data.phone} />
            <input type="hidden" name="requestId" value={data.requestId} />
            <input type="hidden" name="cartToken" value={searchParams.get("cart_token") ?? ""} />
            <label>Verification code<input name="code" inputMode="numeric" pattern="[0-9]{4,9}" maxLength={9} required autoComplete="one-time-code" /></label>
            <label className="identity-checkbox"><input name="marketingConsent" type="checkbox" /> I agree to receive Fashionpur offers on WhatsApp. Optional; you can unsubscribe anytime.</label>
            <button type="submit" disabled={navigation.state !== "idle"}>{navigation.state === "submitting" ? "Verifying…" : "Verify and continue"}</button>
            <p className="identity-muted">Code sent to {data.phone}. In local mock mode use the configured development code.</p>
          </Form>
        ) : (
          <Form method="post" className="identity-form">
            <input type="hidden" name="intent" value="send" />
            <input type="hidden" name="cartToken" value={searchParams.get("cart_token") ?? ""} />
            <label>Mobile number<input name="phone" type="tel" placeholder="+91 9876543210" inputMode="tel" autoComplete="tel" required /></label>
            <button type="submit" disabled={navigation.state !== "idle"}>{navigation.state === "submitting" ? "Sending…" : "Send OTP"}</button>
            <p className="identity-muted">Use your number with country code. We use it only to verify your Fashionpur profile.</p>
          </Form>
        )}
      </section>
    </main>
  );
}
