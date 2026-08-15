import { describe, it, expect } from 'vitest';
import { verifyWebhookSignature } from '../src/core/verify.js';
import { createHmac } from 'node:crypto';

const secret = 'test_secret_key_xyz_123';
const rawBody = JSON.stringify({ orderId: 'ORD_TEST_1', status: 'PAID', utr: '422800000001' });

function makeSignature(body: string, ts: string, key = secret) {
  return createHmac('sha256', key).update(`${body}.${ts}`).digest('hex');
}

describe('verifyWebhookSignature', () => {
  it('validates a correct HMAC signature', () => {
    const ts = Date.now().toString();
    const sig = makeSignature(rawBody, ts);
    expect(verifyWebhookSignature({ rawBody, signature: sig, timestamp: ts, secret })).toBe(true);
  });

  it('rejects a tampered body', () => {
    const ts = Date.now().toString();
    const sig = makeSignature(rawBody, ts);
    const tamperedBody = rawBody.replace('PAID', 'EXPIRED');
    expect(
      verifyWebhookSignature({ rawBody: tamperedBody, signature: sig, timestamp: ts, secret })
    ).toBe(false);
  });

  it('rejects wrong secret', () => {
    const ts = Date.now().toString();
    const sig = makeSignature(rawBody, ts, 'wrong_secret');
    expect(verifyWebhookSignature({ rawBody, signature: sig, timestamp: ts, secret })).toBe(false);
  });

  it('rejects expired timestamp (10 minutes ago)', () => {
    const oldTs = (Date.now() - 600_000).toString();
    const sig = makeSignature(rawBody, oldTs);
    expect(verifyWebhookSignature({ rawBody, signature: sig, timestamp: oldTs, secret })).toBe(false);
  });

  it('accepts within custom toleranceMs window', () => {
    const ts = (Date.now() - 400_000).toString(); // 6.6 minutes ago
    const sig = makeSignature(rawBody, ts);
    expect(
      verifyWebhookSignature({ rawBody, signature: sig, timestamp: ts, secret, toleranceMs: 600_000 })
    ).toBe(true);
  });

  it('rejects empty signature', () => {
    const ts = Date.now().toString();
    expect(
      verifyWebhookSignature({ rawBody, signature: '', timestamp: ts, secret })
    ).toBe(false);
  });

  it('rejects empty secret', () => {
    const ts = Date.now().toString();
    const sig = makeSignature(rawBody, ts);
    expect(
      verifyWebhookSignature({ rawBody, signature: sig, timestamp: ts, secret: '' })
    ).toBe(false);
  });

  it('rejects NaN timestamp', () => {
    const sig = makeSignature(rawBody, 'not-a-number');
    expect(
      verifyWebhookSignature({ rawBody, signature: sig, timestamp: 'not-a-number', secret })
    ).toBe(false);
  });

  it('accepts Buffer rawBody identical to string', () => {
    const ts = Date.now().toString();
    const sig = makeSignature(rawBody, ts);
    expect(
      verifyWebhookSignature({ rawBody: Buffer.from(rawBody), signature: sig, timestamp: ts, secret })
    ).toBe(true);
  });
});
