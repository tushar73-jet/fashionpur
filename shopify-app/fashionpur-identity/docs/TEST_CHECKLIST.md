# Phase 0–1 test checklist

- [ ] Typecheck and lint pass.
- [ ] Tests cover OTP expiry, rate limit, verification, session, consent, logout.
- [ ] Mock OTP works only locally; production rejects it.
- [ ] Invalid/expired verification cannot create a profile session.
- [ ] Logout invalidates its session.
- [ ] Consent defaults to unchecked and records evidence after opt-in.
- [ ] No storefront cookie is attempted through App Proxy.
- [ ] The extension links to the configured dedicated account origin.
- [ ] Existing Razorpay checkout remains unchanged; manual non-payment check is
  recorded before later checkout-adjacent work.
