# Fashionpur WhatsApp Service Implementation Plan

**Goal:** Build a secure, deployable foundation for Fashionpur's consent-based WhatsApp campaigns through Meta WhatsApp Cloud API.

**Architecture:** A TypeScript API runs independently of Shopify. Supabase holds contacts, consent, campaigns, messages, and webhook events. Meta Cloud API supplies outbound template messaging and inbound delivery/reply webhooks.

**Tech Stack:** Node.js, TypeScript, Fastify, Zod, Supabase, Vitest, Meta WhatsApp Cloud API, Render.

**Spec:** `docs/design.md`

## Global constraints

- No secrets may be committed.
- Only E.164 phone numbers with recorded marketing consent are campaign recipients.
- Shopify and CWILL integrations are deferred until their data/consent access is confirmed.

## Delivery phases

### Phase 1: Secure foundation

Create the TypeScript service, local development setup, environment validation, health endpoint, Render configuration, and Supabase connection. No real customer messages are sent in this phase.

### Phase 2: Consent-first customer data

Create the contact and consent database model, secure import API, E.164 phone validation, unsubscribe handling, and audit trail. Shopify/CWILL import begins only after consent mapping is confirmed.

### Phase 3: Meta WhatsApp connection

Connect a Meta Business account, WhatsApp Business Account, phone number, permanent access token, and webhook. Verify webhook signatures and record inbound messages and delivery events.

### Phase 4: Campaign sending

Add approved-template campaigns, audience filters, scheduling, rate-safe sending, delivery/read/failure reporting, and a test-recipient mode. Real broadcasts are enabled only after a successful test campaign.

### Phase 5: Shopify and CWILL connectors

Import eligible Shopify/CWILL contacts, preserve the original consent source, and sync unsubscribe events back where supported. Add abandoned-cart and post-purchase event triggers only after validating the source data.

### Phase 6: Support inbox and AI assistant

Build a shared inbox for replies, assignment and notes, then connect the Fashionpur AI chatbot as a draft-reply assistant. It must not send replies autonomously until its accuracy and escalation rules are approved.

### Phase 7: Operations and growth

Add campaign analytics, audience segments, templates, team roles, monitoring, backups, and privacy/deletion workflows. Evaluate new automation only after consent and delivery metrics are reliable.

## Tasks

### Task 1: Repository foundation

Create the TypeScript/Fastify project, environment-variable validation, health route, local developer instructions, and tests.

### Task 2: Consent and contact domain

Add Supabase migrations and typed repositories for contacts and consent records. Enforce E.164 validation and an active-consent recipient query.

### Task 3: Meta webhook endpoint

Implement Meta webhook verification, signature validation, and idempotent storage of message-status and inbound-message events.

### Task 4: Campaign dispatch

Implement draft campaigns, an approved-template sender, recipient eligibility checks, rate-safe dispatch, and message audit records.

### Task 5: Admin API and deployment

Add protected admin endpoints, Render deployment configuration, environment-variable documentation, and end-to-end test coverage using a mocked Meta API.

## Review focus

- A contact without active marketing consent must never receive a campaign.
- Invalid or non-E.164 phone numbers must be rejected.
- Duplicate Meta webhook delivery must not duplicate stored events.
- Invalid Meta signatures must be rejected.
- A failed Meta send must be recorded without blocking other eligible recipients.
