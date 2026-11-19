# Fashionpur WhatsApp Service

Consent-first WhatsApp campaign service for Fashionpur. It runs outside the Shopify theme and will use Meta WhatsApp Cloud API.

## Local setup

1. Use Node.js 22 or newer.
2. Copy `.env.example` to `.env` and choose a local `ADMIN_API_KEY`.
3. Run `npm install`.
4. Run `npm test`.
5. Run `npm run dev` and open `http://localhost:3000/health`.

No Meta token, customer contact, or campaign-sending feature is present in Phase 1.
