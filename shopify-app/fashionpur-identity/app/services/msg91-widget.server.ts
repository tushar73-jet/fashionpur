import { normalizePhone } from "./identity.server";

type WidgetEnvironment = Partial<Record<"OTP_PROVIDER" | "MSG91_WIDGET_ID" | "MSG91_WIDGET_TOKEN" | "MSG91_AUTH_KEY", string>>;
type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type Msg91WidgetConfig = { widgetId: string; tokenAuth: string };

/**
 * The Widget token is intentionally used by MSG91's browser SDK. It is not an
 * account auth key and must not be used to validate a shopper on this server.
 */
export function getMsg91WidgetConfig(env: WidgetEnvironment = process.env): Msg91WidgetConfig {
  if (env.OTP_PROVIDER !== "msg91-widget") throw new Error("MSG91 Widget OTP is not enabled.");
  if (!env.MSG91_WIDGET_ID) throw new Error("MSG91_WIDGET_ID is required for OTP_PROVIDER=msg91-widget.");
  if (!env.MSG91_WIDGET_TOKEN) throw new Error("MSG91_WIDGET_TOKEN is required for OTP_PROVIDER=msg91-widget.");
  if (!env.MSG91_AUTH_KEY) throw new Error("MSG91_AUTH_KEY is required to validate Widget verification.");
  return { widgetId: env.MSG91_WIDGET_ID, tokenAuth: env.MSG91_WIDGET_TOKEN };
}

/** Validates the Widget access token with MSG91 and returns their verified E.164 phone. */
export async function verifyMsg91WidgetAccessToken(
  accessToken: string,
  env: WidgetEnvironment = process.env,
  request: FetchLike = fetch,
  correlationId?: string,
): Promise<string> {
  const config = getMsg91WidgetConfig(env);
  if (!accessToken || accessToken.length > 8_192) throw new Error("The OTP verification result is invalid. Please request a new code.");

  const response = await request("https://control.msg91.com/api/v5/widget/verifyAccessToken", {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", authkey: env.MSG91_AUTH_KEY! },
    body: JSON.stringify({ "access-token": accessToken }),
  });
  const body = await response.json().catch(() => ({})) as { type?: string; message?: unknown; code?: string | number };
  if (!response.ok || body.type !== "success" || typeof body.message !== "string") {
    // Never log or return an access token. The provider's type/code/message are
    // safe diagnostics for a staging integration and make an invalid/stale
    // auth key distinguishable from an expired OTP.
    console.warn("MSG91 Widget access-token validation failed", {
      correlationId: correlationId ?? null,
      status: response.status,
      type: body.type ?? null,
      code: body.code ?? null,
    });
    const providerMessage = typeof body.message === "string" && body.message.length <= 160
      ? body.message
      : "Verification was rejected.";
    throw new Error(`MSG91 could not validate this OTP: ${providerMessage}`);
  }
  const identifier = body.message.startsWith("+") ? body.message : `+${body.message}`;
  const phone = normalizePhone(identifier);
  if (!phone) throw new Error("MSG91 returned an unsupported mobile number.");
  void config;
  return phone.e164;
}
