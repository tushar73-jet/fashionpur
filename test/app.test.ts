import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('service health', () => {
  it('reports the service as healthy without exposing configuration', async () => {
    const app = createApp();

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ service: 'fashionpur-whatsapp-service', status: 'ok' });
    await app.close();
  });
});
