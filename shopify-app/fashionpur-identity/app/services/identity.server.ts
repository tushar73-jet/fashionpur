import crypto from "node:crypto";
import type { OtpProvider } from "./otp.server";

export type ConsentEvidence = {
  optedInAt: Date;
  source: "otp-login" | "profile";
  policyVersion: string;
};

export type CustomerIdentity = {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  verifiedAt: Date;
  marketingConsent: ConsentEvidence | null;
};

export interface IdentityGateway {
  startOtp(phoneInput: string, ip: string): Promise<{ requestId: string; expiresAt: Date }>;
  verifyOtp(phoneInput: string, requestId: string, code: string, consent: boolean): Promise<CustomerIdentity>;
  createSession(identityId: string): Promise<{ token: string; csrfToken: string; expiresAt: Date }>;
  getSession(token: string | null): Promise<{ identity: CustomerIdentity; csrfToken: string } | null>;
  destroySession(token: string | null): Promise<void>;
  updateProfile(identityId: string, profile: { name?: string; email?: string }): Promise<CustomerIdentity>;
  updateMarketingConsent(identityId: string, optedIn: boolean): Promise<CustomerIdentity>;
  claimCart(identityId: string, cartToken: string | null): Promise<void>;
}

type OtpChallenge = {
  requestId: string;
  phone: string;
  expiresAt: Date;
  consumed: boolean;
};

type StoredSession = { identityId: string; csrfToken: string; expiresAt: Date };
type RateLimit = { count: number; resetAt: number };

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const OTP_WINDOW_MS = 15 * 60 * 1000;
const MAX_OTP_SENDS_PER_WINDOW = 3;

export function normalizePhone(input: string): string | null {
  const compact = input.trim().replace(/[\s()-]/g, "");
  return /^\+[1-9]\d{7,14}$/.test(compact) ? compact : null;
}

function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

/** In-memory repository used until Phase 2 adds Postgres/Prisma persistence. */
export class IdentityService implements IdentityGateway {
  private readonly identitiesByPhone = new Map<string, CustomerIdentity>();
  private readonly identitiesById = new Map<string, CustomerIdentity>();
  private readonly challenges = new Map<string, OtpChallenge>();
  private readonly sessions = new Map<string, StoredSession>();
  private readonly rateLimits = new Map<string, RateLimit>();

  constructor(private readonly otpProvider: OtpProvider) {}

  async startOtp(phoneInput: string, ip: string): Promise<{ requestId: string; expiresAt: Date }> {
    const phone = normalizePhone(phoneInput);
    if (!phone) throw new Error("Enter a valid mobile number with country code.");
    this.consumeRateLimit(`phone:${phone}`);
    this.consumeRateLimit(`ip:${ip}`);
    const sent = await this.otpProvider.send(phone);
    this.challenges.set(sent.requestId, { phone, requestId: sent.requestId, expiresAt: sent.expiresAt, consumed: false });
    return sent;
  }

  async verifyOtp(
    phoneInput: string,
    requestId: string,
    code: string,
    consent: boolean,
  ): Promise<CustomerIdentity> {
    const phone = normalizePhone(phoneInput);
    const challenge = this.challenges.get(requestId);
    if (!phone || !challenge || challenge.phone !== phone || challenge.consumed || challenge.expiresAt <= new Date()) {
      throw new Error("This verification request has expired. Please request a new code.");
    }
    const result = await this.otpProvider.verify(phone, requestId, code);
    if (!result.verified) throw new Error("That verification code is invalid.");
    challenge.consumed = true;
    let identity = this.identitiesByPhone.get(phone);
    if (!identity) {
      identity = { id: crypto.randomUUID(), phone, name: null, email: null, verifiedAt: new Date(), marketingConsent: null };
    }
    identity.verifiedAt = new Date();
    if (consent) identity.marketingConsent = { optedInAt: new Date(), source: "otp-login", policyVersion: "2026-11-19" };
    this.identitiesByPhone.set(phone, identity);
    this.identitiesById.set(identity.id, identity);
    return identity;
  }

  async createSession(identityId: string): Promise<{ token: string; csrfToken: string; expiresAt: Date }> {
    const token = randomToken();
    const csrfToken = randomToken();
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    this.sessions.set(sha256(token), { identityId, csrfToken, expiresAt });
    return { token, csrfToken, expiresAt };
  }

  async getSession(token: string | null): Promise<{ identity: CustomerIdentity; csrfToken: string } | null> {
    if (!token) return null;
    const session = this.sessions.get(sha256(token));
    if (!session || session.expiresAt <= new Date()) return null;
    const identity = this.identitiesById.get(session.identityId);
    return identity ? { identity, csrfToken: session.csrfToken } : null;
  }

  async destroySession(token: string | null) {
    if (token) this.sessions.delete(sha256(token));
  }

  async updateProfile(identityId: string, profile: { name?: string; email?: string }) {
    const identity = this.identitiesById.get(identityId);
    if (!identity) throw new Error("Profile was not found.");
    if (profile.name !== undefined) identity.name = profile.name.trim().slice(0, 120) || null;
    if (profile.email !== undefined) {
      const email = profile.email.trim().toLowerCase();
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email address.");
      identity.email = email || null;
    }
    return identity;
  }

  async updateMarketingConsent(identityId: string, optedIn: boolean) {
    const identity = this.identitiesById.get(identityId);
    if (!identity) throw new Error("Profile was not found.");
    identity.marketingConsent = optedIn
      ? { optedInAt: new Date(), source: "profile", policyVersion: "2026-11-19" }
      : null;
    return identity;
  }

  async claimCart(identityId: string, cartToken: string | null) { void identityId; void cartToken; }

  private consumeRateLimit(key: string) {
    const now = Date.now();
    const existing = this.rateLimits.get(key);
    const limit = !existing || existing.resetAt <= now ? { count: 0, resetAt: now + OTP_WINDOW_MS } : existing;
    if (limit.count >= MAX_OTP_SENDS_PER_WINDOW) throw new Error("Too many codes requested. Please try again later.");
    limit.count += 1;
    this.rateLimits.set(key, limit);
  }
}
