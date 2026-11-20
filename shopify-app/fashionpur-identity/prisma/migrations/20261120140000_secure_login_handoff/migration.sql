CREATE TABLE "IdentityLoginHandoff" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "returnPath" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT NOT NULL,
    CONSTRAINT "IdentityLoginHandoff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IdentityLoginHandoff_codeHash_key" ON "IdentityLoginHandoff"("codeHash");
CREATE INDEX "IdentityLoginHandoff_customerId_expiresAt_idx" ON "IdentityLoginHandoff"("customerId", "expiresAt");
CREATE INDEX "IdentityLoginHandoff_expiresAt_idx" ON "IdentityLoginHandoff"("expiresAt");

ALTER TABLE "IdentityLoginHandoff" ADD CONSTRAINT "IdentityLoginHandoff_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "IdentityCustomer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
