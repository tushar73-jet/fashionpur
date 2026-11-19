# Setup required before production

1. Deploy to a dedicated HTTPS account origin such as `account.fashionpur.com`.
   Do not use the online-store App Proxy for profile sessions.
2. Add `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`,
   `CUSTOMER_ACCOUNT_URL`, `IDENTITY_SESSION_SECRET`, `DATABASE_URL`,
   `OTP_PROVIDER`, `MSG91_AUTH_KEY`, `MSG91_TEMPLATE_ID` and approved MSG91
   flow configuration to the deployment secret manager. Never put them in
   storefront code or chat.
3. Request Shopify protected customer-data approval, then install/re-authorize
   the app for its declared scopes.
4. Enable the Theme App Embed only after a development-theme review.
5. Configure Meta Cloud API in its later phase with a permanent system-user
   token, WABA ID, phone-number ID and webhook verification token.

No Razorpay configuration is required or changed by Phase 1.
