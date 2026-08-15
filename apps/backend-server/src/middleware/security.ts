import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';

const REPLAY_WINDOW_MS = 300_000; // 5 minutes

/**
 * Fastify preHandler: validates HMAC-SHA256 signature + timestamp drift.
 * Used on the /internal/ingest endpoint to authenticate Android daemon requests.
 */
export function verifyDeviceSignature(
  req: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
): void {
  const timestamp = req.headers['x-openupi-timestamp'] as string;
  const signature = req.headers['x-openupi-signature'] as string;

  if (!timestamp || !signature) {
    reply.status(401).send({ error: 'Missing X-OpenUPI-Timestamp or X-OpenUPI-Signature header' });
    return;
  }

  // 1. Replay Attack Shield — reject requests older than 5 minutes
  const reqTime = parseInt(timestamp, 10);
  if (isNaN(reqTime) || Math.abs(Date.now() - reqTime) > REPLAY_WINDOW_MS) {
    reply.status(401).send({ error: 'Timestamp out of bounds — possible replay attack' });
    return;
  }

  // 2. Recompute expected HMAC-SHA256
  const rawBody = JSON.stringify(req.body);
  const expectedSig = createHmac('sha256', process.env.DEVICE_SHARED_SECRET!)
    .update(`${rawBody}.${timestamp}`)
    .digest('hex');

  // 3. Timing-safe comparison (prevents timing oracle attacks)
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);

  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    reply.status(401).send({ error: 'Invalid HMAC device signature' });
    return;
  }

  done();
}

/**
 * Validates the x-api-key header for merchant-facing endpoints.
 */
export function verifyMerchantApiKey(
  req: FastifyRequest,
  reply: FastifyReply,
  done: (err?: Error) => void
): void {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.MERCHANT_API_KEY) {
    reply.status(401).send({ error: 'Unauthorized: invalid x-api-key' });
    return;
  }
  done();
}
