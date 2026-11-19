CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "Session" ("id" TEXT PRIMARY KEY, "shop" TEXT NOT NULL, "state" TEXT NOT NULL, "isOnline" BOOLEAN NOT NULL DEFAULT false, "scope" TEXT, "expires" TIMESTAMP(3), "accessToken" TEXT NOT NULL, "userId" BIGINT, "firstName" TEXT, "lastName" TEXT, "email" TEXT, "accountOwner" BOOLEAN NOT NULL DEFAULT false, "locale" TEXT, "collaborator" BOOLEAN DEFAULT false, "emailVerified" BOOLEAN DEFAULT false, "refreshToken" TEXT, "refreshTokenExpires" TIMESTAMP(3));

CREATE TABLE "IdentityCustomer" ("id" TEXT PRIMARY KEY, "phone" TEXT NOT NULL UNIQUE, "name" TEXT, "email" TEXT, "verifiedAt" TIMESTAMP(3) NOT NULL, "shopifyCustomerId" TEXT UNIQUE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "IdentitySession" ("id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "csrfToken" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "customerId" TEXT NOT NULL REFERENCES "IdentityCustomer"("id") ON DELETE CASCADE);
CREATE TABLE "OtpChallenge" ("id" TEXT PRIMARY KEY, "requestId" TEXT NOT NULL UNIQUE, "phone" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL, "consumedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "MarketingConsent" ("id" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL REFERENCES "IdentityCustomer"("id") ON DELETE CASCADE, "channel" TEXT NOT NULL, "status" TEXT NOT NULL, "source" TEXT NOT NULL, "policyVersion" TEXT NOT NULL, "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "withdrawnAt" TIMESTAMP(3));
CREATE TABLE "CustomerAddress" ("id" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL REFERENCES "IdentityCustomer"("id") ON DELETE CASCADE, "shopifyAddressId" TEXT UNIQUE, "recipientName" TEXT NOT NULL, "phone" TEXT, "address1" TEXT NOT NULL, "address2" TEXT, "city" TEXT NOT NULL, "province" TEXT, "postalCode" TEXT NOT NULL, "countryCode" TEXT NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "CustomerCart" ("id" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL REFERENCES "IdentityCustomer"("id") ON DELETE CASCADE, "shopifyCartToken" TEXT NOT NULL UNIQUE, "cartUrl" TEXT, "currencyCode" TEXT, "totalAmount" DECIMAL(12,2), "status" TEXT NOT NULL DEFAULT 'active', "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "recoveredAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "CustomerCartLine" ("id" TEXT PRIMARY KEY, "cartId" TEXT NOT NULL REFERENCES "CustomerCart"("id") ON DELETE CASCADE, "variantId" TEXT NOT NULL, "productId" TEXT, "title" TEXT NOT NULL, "quantity" INTEGER NOT NULL, "unitPrice" DECIMAL(12,2), "imageUrl" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL, UNIQUE("cartId", "variantId"));
CREATE TABLE "CustomerOrder" ("id" TEXT PRIMARY KEY, "customerId" TEXT NOT NULL REFERENCES "IdentityCustomer"("id") ON DELETE CASCADE, "shopifyOrderId" TEXT NOT NULL UNIQUE, "orderName" TEXT NOT NULL, "financialStatus" TEXT, "fulfillmentStatus" TEXT, "trackingUrl" TEXT, "totalAmount" DECIMAL(12,2), "currencyCode" TEXT, "orderedAt" TIMESTAMP(3) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL);

CREATE INDEX "IdentitySession_customerId_idx" ON "IdentitySession"("customerId");
CREATE INDEX "IdentitySession_expiresAt_idx" ON "IdentitySession"("expiresAt");
CREATE INDEX "OtpChallenge_phone_expiresAt_idx" ON "OtpChallenge"("phone", "expiresAt");
CREATE INDEX "MarketingConsent_customerId_channel_status_idx" ON "MarketingConsent"("customerId", "channel", "status");
CREATE INDEX "CustomerAddress_customerId_idx" ON "CustomerAddress"("customerId");
CREATE INDEX "CustomerCart_customerId_status_idx" ON "CustomerCart"("customerId", "status");
CREATE INDEX "CustomerCart_lastActivityAt_idx" ON "CustomerCart"("lastActivityAt");
CREATE INDEX "CustomerOrder_customerId_orderedAt_idx" ON "CustomerOrder"("customerId", "orderedAt");
