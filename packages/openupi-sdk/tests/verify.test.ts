import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature } from '../src/core/verify.js';
import { createHmac } from 'node:crypto';

describe('Webhook Verification', () => {
  const secret = 'test_secret_key_123';
  const rawBody = JSON.stringify({ orderId: 'ORD_1', status: 'PAID' });
  const timestamp = Date.now().toString();

  it('validates a correct HMAC signature', () => {
    const signature = createHmac('sha256', secret)
      .update(`${rawBody}.${timestamp}`)
      .digest('hex');

    const isValid = verifyWebhookSignature({ rawBody, signature, timestamp, secret });
    expect(isValid).toBe(true);
  });

  it('rejects an expired timestamp', () => {
    const oldTimestamp = (Date.now() - 600000).toString(); // 10 minutes ago
    const signature = createHmac('sha256', secret)
      .update(`${rawBody}.${oldTimestamp}`)
      .digest('hex');

    const isValid = verifyWebhookSignature({ rawBody, signature, timestamp: oldTimestamp, secret });
    expect(isValid).toBe(false);
  });
});
