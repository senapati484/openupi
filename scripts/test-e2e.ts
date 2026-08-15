#!/usr/bin/env ts-node
/**
 * OpenUPI End-to-End Simulation Script
 * ======================================
 * This script simulates the full payment flow:
 * 1. Creates an order via the API
 * 2. Simulates the Android daemon sending a bank credit notification
 * 3. Polls for order status and confirms PAID
 *
 * Usage: OPENUPI_URL=http://localhost:4000 OPENUPI_KEY=sk_live_xxx ts-node scripts/test-e2e.ts
 */

const BASE_URL = process.env.OPENUPI_URL || 'http://localhost:4000';
const API_KEY = process.env.OPENUPI_KEY || '';
const DEVICE_SECRET = process.env.DEVICE_SECRET || '';

import { createHmac } from 'node:crypto';

const merchantHeaders = {
  'Content-Type': 'application/json',
  'x-api-key': API_KEY,
};

function hmacSign(body: string, timestamp: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`${body}.${timestamp}`)
    .digest('hex');
}

async function createOrder(amount: number, orderId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/orders/create`, {
    method: 'POST',
    headers: merchantHeaders,
    body: JSON.stringify({ orderId, amount, note: 'E2E Test', callbackUrl: '' }),
  });
  return res.json() as any;
}

async function simulateDaemonIngest(exactAmount: number) {
  const payload = JSON.stringify({
    amount: exactAmount,
    utr: `E2E${Date.now()}`,
    sender: 'VM-TESTBNK',
    rawText: `Test credited with Rs.${exactAmount}. UPI Ref:${Date.now()}`,
    timestamp: Date.now(),
  });
  const timestamp = Date.now().toString();
  const signature = hmacSign(payload, timestamp, DEVICE_SECRET);

  const res = await fetch(`${BASE_URL}/api/v1/internal/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-OpenUPI-Timestamp': timestamp,
      'X-OpenUPI-Signature': signature,
    },
    body: payload,
  });
  return res.json() as any;
}

async function getStatus(orderId: string) {
  const res = await fetch(`${BASE_URL}/api/v1/orders/${orderId}/status`, {
    headers: merchantHeaders,
  });
  return res.json() as any;
}

async function main() {
  const testOrderId = `E2E-TEST-${Date.now()}`;
  const testAmount = Math.floor(Math.random() * 900 + 100); // ₹100-1000

  console.log(`\n🧪 OpenUPI E2E Test — ₹${testAmount} | OrderID: ${testOrderId}`);
  console.log('━'.repeat(60));

  // Step 1: Create order
  console.log('\n[1/3] Creating order...');
  const order = await createOrder(testAmount, testOrderId);
  if (!order.exactAmount) {
    console.error('❌ Order creation failed:', order);
    process.exit(1);
  }
  console.log(`✓ Order created | exactAmount: ₹${order.exactAmount} | expires: ${order.expiresAt}`);

  // Step 2: Simulate daemon ingest
  console.log(`\n[2/3] Simulating daemon ingest of ₹${order.exactAmount}...`);
  const ingestResult = await simulateDaemonIngest(order.exactAmount);
  console.log(`✓ Ingest result:`, JSON.stringify(ingestResult));

  // Step 3: Poll for status
  console.log('\n[3/3] Polling order status...');
  await new Promise((r) => setTimeout(r, 1000));
  const status = await getStatus(testOrderId);
  console.log(`✓ Final status: ${status.status} | UTR: ${status.utr || 'N/A'}`);

  if (status.status === 'PAID') {
    console.log('\n✅ E2E TEST PASSED — Full payment flow works correctly!\n');
    process.exit(0);
  } else {
    console.error(`\n❌ E2E TEST FAILED — Expected PAID but got ${status.status}\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('❌ E2E script crashed:', err);
  process.exit(1);
});
