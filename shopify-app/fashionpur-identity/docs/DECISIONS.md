# Architecture decisions

Fashionpur Identity is a single-store application. A successful SMS OTP proves
control of a phone number for this application; it is **not** Shopify native
customer authentication and does not sign a shopper into Shopify checkout.

The profile session is issued only by a dedicated customer-account origin (for
example `https://account.fashionpur.com`) as a host-only, HttpOnly, Secure
cookie. Shopify App Proxy is useful for signed storefront requests but cannot
carry shopper cookies because Shopify strips request `Cookie` and response
`Set-Cookie` headers. The app proxy therefore never owns the profile session.

Razorpay Magic Checkout remains installed and unchanged. This application does
not edit its scripts, settings, payment options, checkout fields, discount
logic, or success flow. Any checkout integration is a future, reviewed change.

The app stores a verified E.164 mobile number, optional profile fields,
explicit marketing-consent evidence, and only required cart/order identifiers.
OTP codes are never persisted in plaintext. Meta WhatsApp marketing will only
address explicit opt-ins; lists with no consent are not marketing recipients.
