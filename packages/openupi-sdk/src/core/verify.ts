import { createHmac, timingSafeEqual } from 'node:crypto';
import type { PaymentWebhookPayload } from './types.js';

export interface VerifyWebhookParams {
  rawBody: string | Buffer;
  signature: string;
  timestamp: string;
  secret: string;
  toleranceMs?: number;
}

/**
 * Timing-safe HMAC-SHA256 signature verifier with timestamp drift protection.
 */
export function verifyWebhookSignature({
  rawBody,
  signature,
  timestamp,
  secret,
  toleranceMs = 300_000 // 5 minutes default
}: VerifyWebhookParams): boolean {
  if (!signature || !timestamp || !secret) return false;

  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || Math.abs(Date.now() - timestampNum) > toleranceMs) {
    return false;
  }

  const bodyStr = typeof rawBody === 'string' ? rawBody : rawBody.toString('utf-8');
  const expectedSignature = createHmac('sha256', secret)
    .update(`${bodyStr}.${timestamp}`)
    .digest('hex');

  const sourceBuffer = Buffer.from(signature);
  const targetBuffer = Buffer.from(expectedSignature);

  if (sourceBuffer.length !== targetBuffer.length) {
    return false;
  }

  return timingSafeEqual(sourceBuffer, targetBuffer);
}

export type WebhookCallback = (payload: PaymentWebhookPayload) => Promise<void> | void;
