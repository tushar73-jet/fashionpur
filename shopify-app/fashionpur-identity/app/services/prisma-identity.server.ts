import crypto from "node:crypto";
import prisma from "../db.server";
import type { CustomerIdentity, IdentityGateway } from "./identity.server";
import { normalizePhone } from "./identity.server";
import type { OtpProvider } from "./otp.server";

const TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS = 3;
const HANDOFF_TTL_MS = 2 * 60 * 1000;
const hash = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const token = () => crypto.randomBytes(32).toString("base64url");

function toIdentity(customer: { id: string; phone: string; countryCode: string | null; dialingCode: string | null; locale: string | null; name: string | null; email: string | null; verifiedAt: Date; consents?: { status: string; source: string; policyVersion: string; capturedAt: Date; withdrawnAt: Date | null }[] }): CustomerIdentity {
  const active = customer.consents?.find((item) => item.status === "opted_in" && !item.withdrawnAt);
  return { id: customer.id, phone: customer.phone, countryCode: customer.countryCode, dialingCode: customer.dialingCode, locale: customer.locale, name: customer.name, email: customer.email, verifiedAt: customer.verifiedAt, marketingConsent: active ? { optedInAt: active.capturedAt, source: active.source === "profile" ? "profile" : "otp-login", policyVersion: active.policyVersion } : null };
}

/** Persistent implementation used whenever DATABASE_URL is set. */
export class PrismaIdentityService implements IdentityGateway {
  private readonly limits = new Map<string, { count: number; resetAt: number }>();
  constructor(private readonly otpProvider: OtpProvider) {}

  async startOtp(phoneInput: string, ip: string) {
    const phone = normalizePhone(phoneInput);
    if (!phone) throw new Error("Enter a valid mobile number with country code.");
    this.limit(`phone:${phone.e164}`); this.limit(`ip:${ip}`);
    const sent = await this.otpProvider.send(phone.e164);
    await prisma.otpChallenge.upsert({ where: { requestId: sent.requestId }, create: { id: crypto.randomUUID(), requestId: sent.requestId, phone: phone.e164, expiresAt: sent.expiresAt }, update: { phone: phone.e164, expiresAt: sent.expiresAt, consumedAt: null } });
    return sent;
  }

  async verifyOtp(phoneInput: string, requestId: string, code: string, consent: boolean, locale?: string | null) {
    const phone = normalizePhone(phoneInput);
    const challenge = await prisma.otpChallenge.findUnique({ where: { requestId } });
    if (!phone || !challenge || challenge.phone !== phone.e164 || challenge.consumedAt || challenge.expiresAt <= new Date()) throw new Error("This verification request has expired. Please request a new code.");
    if (!(await this.otpProvider.verify(phone.e164, requestId, code)).verified) throw new Error("That verification code is invalid.");
    await prisma.otpChallenge.update({ where: { requestId }, data: { consumedAt: new Date() } });
    return this.completeVerifiedPhone(phone.e164, consent, locale);
  }

  async completeVerifiedPhone(phoneInput: string, consent: boolean, locale?: string | null) {
    const phone = normalizePhone(phoneInput.trim().startsWith("+") ? phoneInput : `+${phoneInput}`);
    if (!phone) throw new Error("The verified mobile number is invalid.");
    const customer = await prisma.$transaction(async (tx) => {
      const preferredLocale = locale?.trim().slice(0, 35) || null;
      const result = await tx.identityCustomer.upsert({ where: { phone: phone.e164 }, create: { id: crypto.randomUUID(), phone: phone.e164, countryCode: phone.countryCode, dialingCode: phone.dialingCode, locale: preferredLocale, verifiedAt: new Date() }, update: { verifiedAt: new Date(), countryCode: phone.countryCode, dialingCode: phone.dialingCode, ...(preferredLocale ? { locale: preferredLocale } : {}) } });
      if (consent) await tx.marketingConsent.create({ data: { id: crypto.randomUUID(), customerId: result.id, channel: "whatsapp", status: "opted_in", source: "otp-login", policyVersion: "2026-11-19" } });
      return tx.identityCustomer.findUniqueOrThrow({ where: { id: result.id }, include: { consents: { orderBy: { capturedAt: "desc" } } } });
    });
    return toIdentity(customer);
  }

  async createSession(identityId: string) {
    const raw = token(), csrfToken = token(), expiresAt = new Date(Date.now() + TTL_MS);
    await prisma.identitySession.create({ data: { id: crypto.randomUUID(), tokenHash: hash(raw), csrfToken, expiresAt, customerId: identityId } });
    return { token: raw, csrfToken, expiresAt };
  }

  async createLoginHandoff(identityId: string, returnPath: string) {
    const raw = token();
    const expiresAt = new Date(Date.now() + HANDOFF_TTL_MS);
    await prisma.identityLoginHandoff.create({ data: { id: crypto.randomUUID(), codeHash: hash(raw), customerId: identityId, returnPath, expiresAt } });
    return { code: raw, expiresAt };
  }

  async consumeLoginHandoff(raw: string) {
    const codeHash = hash(raw);
    const handoff = await prisma.identityLoginHandoff.findUnique({ where: { codeHash } });
    if (!handoff || handoff.consumedAt || handoff.expiresAt <= new Date()) throw new Error("This login link has expired or already used. Please sign in again.");
    const consumed = await prisma.identityLoginHandoff.updateMany({ where: { id: handoff.id, consumedAt: null, expiresAt: { gt: new Date() } }, data: { consumedAt: new Date() } });
    if (consumed.count !== 1) throw new Error("This login link has expired or already used. Please sign in again.");
    return { session: await this.createSession(handoff.customerId), returnPath: handoff.returnPath };
  }

  async getSession(raw: string | null) {
    if (!raw) return null;
    const session = await prisma.identitySession.findUnique({
      where: { tokenHash: hash(raw) },
      include: { customer: { include: { consents: { orderBy: { capturedAt: "desc" } } } } },
    });
    if (!session || session.expiresAt <= new Date()) return null;
    return { identity: toIdentity(session.customer), csrfToken: session.csrfToken };
  }

  async destroySession(raw: string | null) { if (raw) await prisma.identitySession.deleteMany({ where: { tokenHash: hash(raw) } }); }

  async updateProfile(identityId: string, profile: { name?: string; email?: string }) {
    const name = profile.name?.trim().slice(0, 120) || null;
    const email = profile.email?.trim().toLowerCase() || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
    const customer = await prisma.identityCustomer.update({ where: { id: identityId }, data: { name, email }, include: { consents: { orderBy: { capturedAt: "desc" } } } });
    return toIdentity(customer);
  }

  async updateMarketingConsent(identityId: string, optedIn: boolean) {
    const customer = await prisma.$transaction(async (tx) => {
      if (optedIn) await tx.marketingConsent.create({ data: { id: crypto.randomUUID(), customerId: identityId, channel: "whatsapp", status: "opted_in", source: "profile", policyVersion: "2026-11-19" } });
      else await tx.marketingConsent.updateMany({ where: { customerId: identityId, channel: "whatsapp", status: "opted_in", withdrawnAt: null }, data: { status: "withdrawn", withdrawnAt: new Date() } });
      return tx.identityCustomer.findUniqueOrThrow({ where: { id: identityId }, include: { consents: { orderBy: { capturedAt: "desc" } } } });
    });
    return toIdentity(customer);
  }

  async claimCart(identityId: string, cartToken: string | null, claimSecret: string | null) {
    if (cartToken && claimSecret && claimSecret.length >= 32) await prisma.customerCart.updateMany({ where: { shopifyCartToken: cartToken, claimSecretHash: hash(claimSecret), customerId: null }, data: { customerId: identityId } });
  }

  private limit(key: string) { const now = Date.now(); const current = this.limits.get(key); const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + OTP_WINDOW_MS } : current; if (entry.count >= MAX_SENDS) throw new Error("Too many codes requested. Please try again later."); entry.count += 1; this.limits.set(key, entry); }
}
