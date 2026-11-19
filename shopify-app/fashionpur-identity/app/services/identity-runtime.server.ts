import type { IdentityGateway } from "./identity.server";
import { IdentityService } from "./identity.server";
import { getOtpProvider } from "./otp.server";
import { PrismaIdentityService } from "./prisma-identity.server";

// Phase 1 intentionally uses a process-local store. Phase 2 replaces this with
// a Postgres repository before any production launch.
const globalForIdentity = globalThis as typeof globalThis & { fashionpurIdentity?: IdentityGateway };

export function getIdentityService() {
  globalForIdentity.fashionpurIdentity ??= process.env.DATABASE_URL
    ? new PrismaIdentityService(getOtpProvider())
    : new IdentityService(getOtpProvider());
  return globalForIdentity.fashionpurIdentity;
}
