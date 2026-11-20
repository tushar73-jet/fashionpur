# MSG91 Widget Custom UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Fashionpur OTP popup use MSG91's Widget custom-UI flow without requiring a direct SendOTP template ID.

**Architecture:** The storefront loads MSG91's Widget SDK only after a shopper requests an OTP. It uses the public widget token to send and verify an OTP, then passes only MSG91's short-lived verification access token to Fashionpur's backend. The backend validates that token with MSG91 using the server-only auth key, normalizes the returned phone, creates the Supabase identity/session, and claims only the shopper's own cart.

**Tech Stack:** Shopify Theme App Extension, vanilla storefront JavaScript, React Router, TypeScript, Prisma/Supabase, MSG91 Widget SDK.

## Global Constraints

- Keep the Fashionpur popup, Razorpay Magic Checkout, live theme, and WhatsApp delivery untouched.
- Do not expose the MSG91 account auth key; widget token is an SDK credential and may be delivered only to the configured storefront origin.
- Preserve international E.164 normalization and explicit WhatsApp consent.

## Tasks

- [ ] Add failing tests for widget configuration, access-token validation, and extension Widget SDK use.
- [ ] Add a server-side MSG91 Widget verifier and an authenticated widget configuration endpoint.
- [ ] Add gateway support for creating/returning an identity from an already verified phone.
- [ ] Replace direct SendOTP browser calls with the Widget SDK's send, resend, verify, and backend token-validation sequence.
- [ ] Update environment documentation, run the complete quality suite, and commit the change.
