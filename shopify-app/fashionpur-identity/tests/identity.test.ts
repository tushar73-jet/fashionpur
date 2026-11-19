import assert from "node:assert/strict";
import test from "node:test";
import { IdentityService, normalizePhone } from "../app/services/identity.server";
import { MockOtpProvider } from "../app/services/otp.server";

test("normalizes only E.164 phone numbers", () => {
  assert.equal(normalizePhone(" +91 99344 56783 "), "+919934456783");
  assert.equal(normalizePhone("9934456783"), null);
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

test("an invalid OTP cannot produce a session", async () => {
  const service = new IdentityService(new MockOtpProvider("123456"));
  const sent = await service.startOtp("+919934456783", "127.0.0.1");
  await assert.rejects(() => service.verifyOtp("+919934456783", sent.requestId, "999999", false), /invalid/);
  assert.equal(await service.getSession("never-issued"), null);
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
