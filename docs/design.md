# Fashionpur WhatsApp Service — Design

## Intent

Provide Fashionpur with its own WhatsApp messaging service for customers who have given marketing consent. The service must not put Meta credentials or sending logic in the Shopify theme.

## Scope of the first version

- Store opted-in customer contacts and consent evidence.
- Receive Meta webhook events for inbound messages and delivery statuses.
- Create a campaign from an approved Meta template and send it to a selected consented audience.
- Record queued, sent, delivered, read, failed, and replied events.
- Expose a small protected admin API for managing contacts and campaigns.

## Not in the first version

- Automated AI replies.
- Importing CWILL or Shopify data automatically.
- A public customer-facing dashboard.
- Sending free-form marketing messages outside Meta's permitted conversation window.

## Architecture

The API is a Node.js/TypeScript service hosted on Render. Supabase stores contacts, consent, campaigns, message records, and webhook events. Meta WhatsApp Cloud API is the only outbound sending provider. Shopify/CWILL connectors will be separate modules added only after consent fields and data-export access are verified.

## Data ownership and safety

- Store phone numbers in E.164 format and keep the consent source and timestamp.
- Send only to contacts with active marketing consent.
- Keep all API tokens in Render environment variables; never commit them.
- Verify Meta webhook signatures before accepting events.
- Meta template name and language are required for outbound campaigns.

## Delivery sequence

1. An administrator imports or creates a consented contact.
2. An administrator creates a draft campaign using a Meta-approved template.
3. The service validates consent and queues eligible recipients.
4. Meta Cloud API sends the template.
5. Webhooks update delivery and reply history in Supabase.

## Chosen approach

Direct Meta Cloud API + Supabase + Render. It gives Fashionpur ownership of the application and data model while avoiding a WhatsApp marketing-platform subscription.
