import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyMetaSignature(body: string, signature: string | undefined, appSecret: string): boolean {
  if (!signature?.startsWith('sha256=')) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', appSecret).update(body).digest('hex')}`;
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}
