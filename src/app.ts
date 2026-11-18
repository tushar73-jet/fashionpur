import Fastify, { type FastifyInstance } from 'fastify';

export function createApp(): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    service: 'fashionpur-whatsapp-service',
    status: 'ok',
  }));

  return app;
}
