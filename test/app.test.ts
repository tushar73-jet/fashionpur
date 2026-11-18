import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { createHmac } from 'node:crypto';

describe('service health', () => {
  it('reports the service as healthy without exposing configuration', async () => {
    const app = createApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: 'fashionpur-whatsapp-service', status: 'ok' });
    await app.close();
  });
});

describe('Meta webhook verification', () => {
  it('returns Meta challenge only for the configured verification token', async () => {
    const app = createApp({ metaAppSecret: 'test-secret', metaVerifyToken: 'verify-me' });

    const response = await app.inject({
      method: 'GET',
      url: '/webhooks/meta?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=abc123',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('abc123');
    await app.close();
  });

  it('rejects a Meta webhook event with an invalid signature', async () => {
    const app = createApp({ metaAppSecret: 'test-secret', metaVerifyToken: 'verify-me' });

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/meta',
      headers: { 'x-hub-signature-256': 'sha256=invalid', 'content-type': 'application/json' },
      payload: JSON.stringify({ object: 'whatsapp_business_account' }),
    });

    expect(response.statusCode).toBe(401);
    await app.close();
  });

  it('accepts a correctly signed Meta webhook event', async () => {
    const payload = JSON.stringify({ object: 'whatsapp_business_account' });
    const signature = `sha256=${createHmac('sha256', 'test-secret').update(payload).digest('hex')}`;
    const app = createApp({ metaAppSecret: 'test-secret', metaVerifyToken: 'verify-me' });

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/meta',
      headers: { 'x-hub-signature-256': signature, 'content-type': 'application/json' },
      payload,
    });

    expect(response.statusCode).toBe(200);
    await app.close();
  });
});
