# Identity and profile security

- OTP requests are server-side, rate-limited by IP and E.164 phone, and expire.
- MSG91 is called only from the server; browser code has no MSG91 credential.
- The development mock accepts a local test code only with `OTP_PROVIDER=mock`;
  production must reject that provider.
- Production profile cookies use `__Host-`, `HttpOnly`, `Secure`,
  `SameSite=Lax`, `Path=/`, and no `Domain` attribute.
- Profile mutations require an authenticated session and CSRF token; responses
  are `Cache-Control: no-store`.
- Consent is off by default. Timestamp, source and policy version are recorded.
