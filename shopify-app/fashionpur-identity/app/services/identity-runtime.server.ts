import { IdentityService } from "./identity.server";
import { getOtpProvider } from "./otp.server";

// Phase 1 intentionally uses a process-local store. Phase 2 replaces this with
// a Postgres repository before any production launch.
const globalForIdentity = globalThis as typeof globalThis & { fashionpurIdentity?: IdentityService };

export function getIdentityService() {
  globalForIdentity.fashionpurIdentity ??= new IdentityService(getOtpProvider());
  return globalForIdentity.fashionpurIdentity;
}
