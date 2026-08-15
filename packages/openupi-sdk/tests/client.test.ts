import { describe, it, expect } from 'vitest';
import { OpenUPI } from '../src/node/client.js';

describe('OpenUPI client', () => {
  it('initializes with apiUrl and apiKey', () => {
    const upi = new OpenUPI({ apiUrl: 'https://pay.example.com', apiKey: 'key_test_123' });
    expect(upi).toBeDefined();
    expect(upi.orders).toBeDefined();
    expect(upi.admin).toBeDefined();
    expect(upi.webhooks).toBeDefined();
  });

  it('throws if apiUrl is missing', () => {
    expect(
      () => new OpenUPI({ apiUrl: '', apiKey: 'key_123' })
    ).toThrow('[OpenUPI] apiUrl is required');
  });

  it('throws if apiKey is missing', () => {
    expect(
      () => new OpenUPI({ apiUrl: 'https://pay.example.com', apiKey: '' })
    ).toThrow('[OpenUPI] apiKey is required');
  });

  it('strips trailing slash from apiUrl', () => {
    const upi = new OpenUPI({ apiUrl: 'https://pay.example.com/', apiKey: 'key_123' });
    // streamUrl exposes the baseUrl behavior without making a network call
    const url = upi.orders.streamUrl('ORD_1');
    expect(url).toBe('https://pay.example.com/api/v1/orders/ORD_1/stream');
  });

  it('streamUrl returns correct SSE endpoint', () => {
    const upi = new OpenUPI({ apiUrl: 'https://pay.example.com', apiKey: 'key_123' });
    expect(upi.orders.streamUrl('ORD_999')).toBe(
      'https://pay.example.com/api/v1/orders/ORD_999/stream'
    );
  });

  it('webhooks.verify uses apiKey as default secret', () => {
    const secret = 'my_api_secret';
    const upi = new OpenUPI({ apiUrl: 'https://pay.example.com', apiKey: secret });

    const { createHmac } = require('node:crypto');
    const rawBody = JSON.stringify({ orderId: 'ORD_42', status: 'PAID' });
    const ts = Date.now().toString();
    const signature = createHmac('sha256', secret).update(`${rawBody}.${ts}`).digest('hex');

    const isValid = upi.webhooks.verify({ rawBody, signature, timestamp: ts });
    expect(isValid).toBe(true);
  });

  it('admin.exportCsvUrl returns correct endpoint', () => {
    const upi = new OpenUPI({ apiUrl: 'https://pay.example.com', apiKey: 'key_123' });
    expect(upi.admin.exportCsvUrl()).toBe('https://pay.example.com/api/v1/admin/export/csv');
  });
});
