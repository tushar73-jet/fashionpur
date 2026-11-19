import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import test from "node:test";

function loadLocalEnv() {
  for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, "");
  }
}

const enabled = process.env.RUN_SUPABASE_TESTS === "1";

test("Supabase has Fashionpur Identity tables and persists a verified customer", { skip: !enabled }, async () => {
  loadLocalEnv();
  const { default: prisma } = await import("../app/db.server");
  const { PrismaIdentityService } = await import("../app/services/prisma-identity.server");
  const { MockOtpProvider } = await import("../app/services/otp.server");
  const expectedTables = ["Session", "IdentityCustomer", "IdentitySession", "OtpChallenge", "MarketingConsent", "CustomerAddress", "CustomerCart", "CustomerCartLine", "CustomerOrder"];
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  for (const table of expectedTables) assert.ok(tables.some((row) => row.tablename === table), `${table} exists`);

  const service = new PrismaIdentityService(new MockOtpProvider("123456"));
  const phone = `+91${String(Date.now()).slice(-10)}`;
  const cartToken = `phase3-test-${crypto.randomUUID()}`;
  let customerId: string | undefined;
  try {
    await prisma.customerCart.create({ data: { id: crypto.randomUUID(), shopifyCartToken: cartToken, status: "active" } });
    const challenge = await service.startOtp(phone, "127.0.0.1");
    const customer = await service.verifyOtp(phone, challenge.requestId, "123456", true);
    customerId = customer.id;
    await service.claimCart(customer.id, cartToken);
    await service.updateProfile(customer.id, { name: "Persistence Test", email: "persistence-test@example.invalid" });
    await prisma.customerAddress.create({ data: { id: crypto.randomUUID(), customerId: customer.id, recipientName: "Persistence Test", address1: "Test address", city: "Test City", postalCode: "000000", countryCode: "IN" } });
    const session = await service.createSession(customer.id);
    const restartedService = new PrismaIdentityService(new MockOtpProvider("123456"));
    const restored = await restartedService.getSession(session.token);
    assert.equal(restored?.identity.phone, phone);
    assert.equal(restored?.identity.name, "Persistence Test");
    assert.equal(restored?.identity.marketingConsent?.source, "otp-login");
    assert.equal((await prisma.customerAddress.count({ where: { customerId: customer.id } })), 1);
    assert.equal((await prisma.customerCart.findUnique({ where: { shopifyCartToken: cartToken } }))?.customerId, customer.id);
    await restartedService.updateMarketingConsent(customer.id, false);
    assert.equal((await restartedService.getSession(session.token))?.identity.marketingConsent, null);
  } finally {
    if (customerId) await prisma.identityCustomer.delete({ where: { id: customerId } });
    await prisma.$disconnect();
  }
});
