import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { IdentityService, normalizePhone } from "../app/services/identity.server";
import { MockOtpProvider } from "../app/services/otp.server";
import { assertCsrf } from "../app/services/customer-session.server";
import { getMsg91WidgetConfig, verifyMsg91WidgetAccessToken } from "../app/services/msg91-widget.server";
import { response as storefrontResponse } from "../app/services/storefront-api.server";

test("the staging app embed falls back to the deployed account origin", async () => {
  const liquid = await readFile(new URL("../extensions/fashionpur-identity/blocks/identity-embed.liquid", import.meta.url), "utf8");
  assert.match(liquid, /data-account-url="\{\{ block\.settings\.account_url \| default: 'https:\/\/fashionpur\.onrender\.com' \| escape \}\}"/);
});

test("the storefront extension owns Dawn desktop and mobile account links", async () => {
  const script = await readFile(new URL("../extensions/fashionpur-identity/assets/fashionpur-identity.js", import.meta.url), "utf8");
  assert.match(script, /#customer_login_link/);
  assert.match(script, /\.fp-mobile-nav a\[href\^='\/account'\]/);
  assert.match(script, /openAccountOrLogin/);
  assert.match(script, /https:\/\/verify\.msg91\.com\/otp-provider\.js/);
  assert.match(script, /account\/api\/otp\/widget-config/);
  assert.match(script, /account\/api\/otp\/widget-verify/);
  assert.match(script, /success: \(\) => \{\}/);
  assert.match(script, /failure: \(item\) => \{ widgetInitializationError/);
});

test("OTP API routes answer browser CORS preflight requests", async () => {
  for (const path of ["account.api.otp.send.ts", "account.api.otp.verify.ts"]) {
    const route = await readFile(new URL(`../app/routes/${path}`, import.meta.url), "utf8");
    assert.match(route, /export async function loader/);
    assert.match(route, /request\.method === "OPTIONS"/);
  }
});

test("storefront CORS accepts both Fashionpur production hostnames", () => {
  const previous = process.env.STOREFRONT_ORIGIN;
  process.env.STOREFRONT_ORIGIN = "https://www.fashionpur.com";
  try {
    const result = storefrontResponse(new Request("https://fashionpur.onrender.com/account/api/otp/widget-config", {
      headers: { origin: "https://fashionpur.com" },
    }), {});
    assert.equal(result.headers.get("access-control-allow-origin"), "https://fashionpur.com");
  } finally {
    if (previous === undefined) delete process.env.STOREFRONT_ORIGIN;
    else process.env.STOREFRONT_ORIGIN = previous;
  }
});

test("MSG91 Widget configuration requires its SDK credentials instead of a SendOTP template", () => {
  const config = getMsg91WidgetConfig({
    OTP_PROVIDER: "msg91-widget",
    MSG91_WIDGET_ID: "widget-id",
    MSG91_WIDGET_TOKEN: "widget-token",
    MSG91_AUTH_KEY: "server-auth-key",
  });
  assert.deepEqual(config, { widgetId: "widget-id", tokenAuth: "widget-token" });
  assert.throws(() => getMsg91WidgetConfig({ OTP_PROVIDER: "msg91-widget", MSG91_WIDGET_ID: "widget-id" }), /MSG91_WIDGET_TOKEN/);
});

test("MSG91 Widget access-token verification accepts only a provider-verified international phone", async () => {
  const requested: { url?: string; authkey?: string; body?: unknown } = {};
  const phone = await verifyMsg91WidgetAccessToken("verified-widget-token", {
    OTP_PROVIDER: "msg91-widget",
    MSG91_WIDGET_ID: "widget-id",
    MSG91_WIDGET_TOKEN: "widget-token",
    MSG91_AUTH_KEY: "server-auth-key",
  }, async (url, init) => {
    requested.url = String(url);
    requested.authkey = new Headers(init?.headers).get("authkey") ?? undefined;
    requested.body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ type: "success", message: "14165550123" }), { status: 200 });
  });
  assert.equal(phone, "+14165550123");
  assert.match(requested.url ?? "", /verifyAccessToken$/);
  assert.equal(requested.authkey, "server-auth-key");
  assert.deepEqual(requested.body, { "access-token": "verified-widget-token" });
});

test("normalizes supported global phone numbers to E.164", () => {
  const examples = [["+91 99344 56783", "+919934456783", "IN"], ["+971 50 123 4567", "+971501234567", "AE"], ["+966 50 123 4567", "+966501234567", "SA"], ["+44 7500 123456", "+447500123456", "GB"], ["+49 1512 3456789", "+4915123456789", "DE"], ["+33 6 12 34 56 78", "+33612345678", "FR"], ["+1 202 555 0123", "+12025550123", "US"], ["+1 416 555 0123", "+14165550123", "CA"]] as const;
  for (const [input, expected, country] of examples) { const result = normalizePhone(input); assert.equal(result?.e164, expected); assert.equal(result?.countryCode, country); }
  assert.equal(normalizePhone("+000000000"), null);
});

test("verified OTP creates an identity and only explicit consent opts in", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const sent = await service.startOtp("+919934456783", "127.0.0.1");
  const identity = await service.verifyOtp("+919934456783", sent.requestId, "123456", false);
  assert.equal(identity.phone, "+919934456783");
  assert.equal(identity.marketingConsent, null);

  const sentAgain = await service.startOtp("+919934456783", "127.0.0.2");
  const optedIn = await service.verifyOtp("+919934456783", sentAgain.requestId, "123456", true);
  assert.equal(optedIn.marketingConsent?.source, "otp-login");
});

test("a provider-verified phone can create an identity without trusting a browser phone field", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const identity = await service.completeVerifiedPhone("14165550123", true, "en-CA");
  assert.equal(identity.phone, "+14165550123");
  assert.equal(identity.countryCode, "CA");
  assert.equal(identity.marketingConsent?.source, "otp-login");
});

test("an invalid OTP cannot produce a session", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const sent = await service.startOtp("+919934456783", "127.0.0.1");
  await assert.rejects(() => service.verifyOtp("+919934456783", sent.requestId, "999999", false), /invalid/);
  assert.equal(await service.getSession("never-issued"), null);
});

test("international formatting cannot create duplicate identities", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const first = await service.startOtp("+1 416 555 0123", "127.0.0.1");
  const canadian = await service.verifyOtp("+1 416 555 0123", first.requestId, "123456", false);
  const second = await service.startOtp("+14165550123", "127.0.0.2");
  const sameCanadian = await service.verifyOtp("+14165550123", second.requestId, "123456", false);
  assert.equal(canadian.id, sameCanadian.id);
  assert.equal(sameCanadian.countryCode, "CA");
  assert.equal(sameCanadian.dialingCode, "+1");
});

test("sessions keep international customers isolated", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const uaeRequest = await service.startOtp("+971501234567", "127.0.0.1");
  const uae = await service.verifyOtp("+971501234567", uaeRequest.requestId, "123456", false);
  const ukRequest = await service.startOtp("+447500123456", "127.0.0.2");
  const uk = await service.verifyOtp("+447500123456", ukRequest.requestId, "123456", true);
  await service.updateProfile(uae.id, { name: "UAE customer", email: "uae@example.com" });
  const ukSession = await service.createSession(uk.id);
  const current = await service.getSession(ukSession.token);
  assert.equal(current?.identity.id, uk.id);
  assert.equal(current?.identity.phone, "+447500123456");
  assert.equal(current?.identity.email, null);
  assert.ok(current?.identity.marketingConsent);
});

test("sessions can be destroyed and profile updates require the verified identity", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const sent = await service.startOtp("+919934456783", "127.0.0.1");
  const identity = await service.verifyOtp("+919934456783", sent.requestId, "123456", false);
  await service.updateProfile(identity.id, { name: "Tushar", email: "tushar@example.com" });
  const session = await service.createSession(identity.id);
  assert.equal((await service.getSession(session.token))?.identity.email, "tushar@example.com");
  await service.destroySession(session.token);
  assert.equal(await service.getSession(session.token), null);
});

test("OTP send rate limit protects a phone number", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  await service.startOtp("+919934456783", "127.0.0.1");
  await service.startOtp("+919934456783", "127.0.0.2");
  await service.startOtp("+919934456783", "127.0.0.3");
  await assert.rejects(() => service.startOtp("+919934456783", "127.0.0.4"), /Too many/);
});

test("CSRF tokens are required for authenticated JSON mutations", () => {
  assert.doesNotThrow(() => assertCsrf("correct-token", "correct-token"));
  assert.throws(() => assertCsrf(null, "correct-token"), (error: unknown) => error instanceof Response && error.status === 403);
  assert.throws(() => assertCsrf("wrong-token", "correct-token"), (error: unknown) => error instanceof Response && error.status === 403);
});
