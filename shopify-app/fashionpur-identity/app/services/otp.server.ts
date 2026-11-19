import crypto from "node:crypto";

export type OtpSendResult = { requestId: string; expiresAt: Date };
export type OtpVerifyResult = { verified: boolean };

export interface OtpProvider {
  send(phone: string): Promise<OtpSendResult>;
  verify(phone: string, requestId: string, code: string): Promise<OtpVerifyResult>;
}

type Msg91Response = { type?: string; request_id?: string; message?: string };

function msg91Mobile(phone: string) {
  return phone.replace(/^\+/, "");
}

/** Server-side adapter for MSG91's current SendOTP v5 endpoints. */
export class Msg91OtpProvider implements OtpProvider {
  constructor(
    private readonly config: { authKey: string; templateId: string; expiryMinutes?: number },
  ) {}

  async send(phone: string): Promise<OtpSendResult> {
    const url = new URL("https://control.msg91.com/api/v5/otp");
    url.searchParams.set("template_id", this.config.templateId);
    url.searchParams.set("mobile", msg91Mobile(phone));
    url.searchParams.set("otp_expiry", String(this.config.expiryMinutes ?? 5));
    url.searchParams.set("otp_length", "6");
    url.searchParams.set("realTimeResponse", "1");

    const response = await fetch(url, {
      method: "POST",
      headers: { authkey: this.config.authKey, "content-type": "application/json" },
      body: "{}",
    });
    const body = (await response.json().catch(() => ({}))) as Msg91Response;
    if (!response.ok || body.type !== "success" || !body.request_id) {
      throw new Error("MSG91 could not send an OTP. Check server configuration and DLT template.");
    }
    return {
      requestId: body.request_id,
      expiresAt: new Date(Date.now() + (this.config.expiryMinutes ?? 5) * 60_000),
    };
  }

  async verify(phone: string, _requestId: string, code: string): Promise<OtpVerifyResult> {
    const url = new URL("https://control.msg91.com/api/v5/otp/verify");
    url.searchParams.set("mobile", msg91Mobile(phone));
    url.searchParams.set("otp", code);
    const response = await fetch(url, { headers: { authkey: this.config.authKey } });
    const body = (await response.json().catch(() => ({}))) as Msg91Response;
    return {
      verified: response.ok && body.message === "OTP verified success",
    };
  }
}

/**
 * Only for local development/tests. It never sends an SMS and must not be
 * selected when NODE_ENV is production.
 */
export class MockOtpProvider implements OtpProvider {
  constructor(private readonly expectedCode: string) {}

  async send(phone: string): Promise<OtpSendResult> {
    void phone;
    return {
      requestId: crypto.randomUUID(),
      expiresAt: new Date(Date.now() + 5 * 60_000),
    };
  }

  async verify(phone: string, requestId: string, code: string): Promise<OtpVerifyResult> {
    void phone;
    void requestId;
    const supplied = Buffer.from(code);
    const expected = Buffer.from(this.expectedCode);
    return { verified: supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected) };
  }
}

export function getOtpProvider(env = process.env): OtpProvider {
  const provider = env.OTP_PROVIDER ?? "mock";
  if (provider === "msg91") {
    if (!env.MSG91_AUTH_KEY || !env.MSG91_TEMPLATE_ID) {
      throw new Error("MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required for OTP_PROVIDER=msg91.");
    }
    return new Msg91OtpProvider({ authKey: env.MSG91_AUTH_KEY, templateId: env.MSG91_TEMPLATE_ID });
  }
  if (provider === "mock" && env.NODE_ENV !== "production") {
    return new MockOtpProvider(env.MOCK_OTP_CODE ?? "000000");
  }
  throw new Error("A production MSG91 OTP provider must be configured.");
}
