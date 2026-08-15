import { createHmac, timingSafeEqual } from 'node:crypto';

export interface VerifyWebhookParams {
  rawBody: string;
  signature: string;
  timestamp: string;
  secret: string;
  toleranceMs?: number;
}

export function verifyWebhookSignature({
  rawBody,
  signature,
  timestamp,
  secret,
  toleranceMs = 300000 // 5 minutes default
}: VerifyWebhookParams): boolean {
  if (!signature || !timestamp || !secret) return false;

  // Replay Attack Protection
  const timestampNum = parseInt(timestamp, 10);
  if (isNaN(timestampNum) || Math.abs(Date.now() - timestampNum) > toleranceMs) {
    return false;
  }

  // Compute Expected HMAC-SHA256
  const expectedSignature = createHmac('sha256', secret)
    .update(`${rawBody}.${timestamp}`)
    .digest('hex');

  const sourceBuffer = Buffer.from(signature);
  const targetBuffer = Buffer.from(expectedSignature);

  if (sourceBuffer.length !== targetBuffer.length) {
    return false;
  }

  return timingSafeEqual(sourceBuffer, targetBuffer);
}
