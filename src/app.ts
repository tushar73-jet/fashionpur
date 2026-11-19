import Fastify, { type FastifyInstance } from 'fastify';
import { Readable } from 'node:stream';
import { verifyMetaSignature } from './webhooks/meta-signature.js';

declare module 'fastify' {
  interface FastifyRequest {
    rawBody?: string;
  }
}

export interface AppOptions {
  metaAppSecret?: string;
  metaVerifyToken?: string;
}

export function createApp(options: AppOptions = {}): FastifyInstance {
  const app = Fastify({ logger: true });
  const metaAppSecret = options.metaAppSecret;
  const metaVerifyToken = options.metaVerifyToken;

  app.get('/health', async () => ({
    service: 'fashionpur-whatsapp-service',
    status: 'ok',
  }));

  if (metaAppSecret && metaVerifyToken) {
    app.addHook('preParsing', (request, _reply, payload, done) => {
      const chunks: Buffer[] = [];

      payload.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      payload.on('error', done);
      payload.on('end', () => {
        request.rawBody = Buffer.concat(chunks).toString('utf8');
        done(null, Readable.from(request.rawBody));
      });
    });

    app.get<{ Querystring: { 'hub.mode'?: string; 'hub.verify_token'?: string; 'hub.challenge'?: string } }>(
      '/webhooks/meta',
      async (request, reply) => {
        const query = request.query;

        if (query['hub.mode'] === 'subscribe' && query['hub.verify_token'] === metaVerifyToken) {
          return reply.type('text/plain').send(query['hub.challenge'] ?? '');
        }

        return reply.code(403).send();
      },
    );

    app.post('/webhooks/meta', async (request, reply) => {
      const rawBody = request.rawBody ?? '';
      const signatureHeader = request.headers['x-hub-signature-256'];
      const signature = typeof signatureHeader === 'string' ? signatureHeader : undefined;

      if (!verifyMetaSignature(rawBody, signature, metaAppSecret)) {
        return reply.code(401).send();
      }

      return reply.code(200).send();
    });
  }

  return app;
}
