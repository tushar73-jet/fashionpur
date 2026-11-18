import Fastify, { type FastifyInstance } from 'fastify';
import { verifyMetaSignature } from './webhooks/meta-signature.js';

export interface AppOptions {
  metaAppSecret?: string;
  metaVerifyToken?: string;
}

export function createApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });

  app.get('/health', async () => ({
    service: 'fashionpur-whatsapp-service',
    status: 'ok',
  }));

  if (options.metaAppSecret && options.metaVerifyToken) {
    app.get<{ Querystring: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string } }>(
      '/webhooks/meta',
      async (request, reply) => {
        const query = request.query;

        if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === options.metaVerifyToken) {
          return reply.type('text/plain').send(query['hub.challenge'] ?? '');
        }

        return reply.code(403).send();
      },
    );

    app.post('/webhooks/meta', async (request, reply) => {
      const rawBody = JSON.stringify(request.body);
      const signatureHeader = request.headers['x-hub-signature-256'];
      const signature = typeof signatureHeader === 'string' ? signatureHeader : undefined;

      if (!verifyMetaSignature(rawBody, signature, options.metaAppSecret)) {
        return reply.code(401).send();
      }

      return reply.code(200).send();
    });
  }

  return app;
}
