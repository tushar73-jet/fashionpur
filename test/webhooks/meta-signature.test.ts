import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyMetaSignature } from '../../src/webhooks/meta-signature.js';

describe('Meta webhook signatures', () => {
  it('accepts a valid SHA-256 signature', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const secret = 'app-secret';
    const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;

    expect(verifyMetaSignature(body, signature, secret)).toBe(true);
  });

  it('rejects an invalid signature', () => {
    expect(verifyMetaSignature('{"object":"test"}', 'sha256=not-valid', 'app-secret')).toBe(false);
  });
});
