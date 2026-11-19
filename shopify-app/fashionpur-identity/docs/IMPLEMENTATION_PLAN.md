# Implementation plan

## Phase 0 — foundation

- Shopify React Router application and Theme App Extension shell.
- Minimal local app scopes; no config deploy yet.
- Architecture, security, Razorpay-compatibility and setup documents.

## Phase 1 — OTP and customer profile

- Server-side OTP provider interface, MSG91 adapter and safe local mock.
- App-owned verified identity, consent and profile session.
- Customer login, OTP verification, profile, consent and logout routes.
- Theme embed linking to a dedicated account origin, never proxy cookies.

## Gated subsequent phases

2. Postgres persistence, Shopify customer/order linkage and order view.
3. Cart association and abandonment events.
4. Meta Cloud API templates and recovery automation, consent-gated.
5. Merchant dashboard, analytics, retention/export/deletion and audits.
