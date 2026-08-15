<p align="center">
  <a href="https://github.com/senapati484/openupi">
    <img src="https://raw.githubusercontent.com/senapati484/openupi/main/public/openupi.png" width="110" height="110" alt="OpenUPI Logo" style="border-radius: 20%;" />
  </a>
</p>

<h1 align="center">openupi-sdk</h1>

<p align="center">
  <b>Universal TypeScript / JavaScript SDK &amp; React UI Widgets for OpenUPI</b><br />
  Zero-fee, self-hosted UPI payment gateway &mdash; seamless integration for React frontends and Node.js backends.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openupi-sdk"><img src="https://img.shields.io/npm/v/openupi-sdk?color=blue&label=npm%20openupi-sdk" alt="npm" /></a>
  <a href="https://github.com/senapati484/openupi/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="MIT" /></a>
  <img src="https://img.shields.io/badge/ESM%20%2B%20CJS-supported-green" alt="Dual build" />
  <img src="https://img.shields.io/badge/TypeScript-first-blue" alt="TypeScript" />
</p>

---

## Table of Contents

- [Installation](#installation)
- [Subpath Exports](#subpath-exports)
- [Environment Variables](#environment-variables)
- [Quick Start: End-to-End Flow](#quick-start-end-to-end-flow)
- [Backend SDK (Node.js)](#backend-sdk-nodejs)
  - [Initialize Client](#1-initialize-the-client)
  - [Create Payment Order](#2-create-a-payment-order)
  - [Poll or Stream Order Status](#3-poll-or-stream-order-status)
  - [Manual UTR Claim](#4-manual-utr-claim-customer-fallback)
  - [Admin: Stats & Ledger](#5-admin-stats--transaction-ledger)
  - [Admin: Reconcile Unmatched Credits](#6-admin-reconcile-unmatched-bank-credits)
  - [Verify Webhooks (Manual)](#7-verify-webhooks-manually)
  - [Express Webhook Handler](#8-express-webhook-handler)
  - [Next.js App Router Handler](#9-nextjs-app-router-webhook-handler)
  - [Fastify Webhook Handler](#10-fastify-webhook-handler)
  - [Framework-Agnostic Handler](#11-framework-agnostic-webhook-processor)
- [Frontend SDK (React)](#frontend-sdk-react)
  - [OpenUPIProvider](#openupi-provider)
  - [UPICheckoutModal](#upicheckoutmodal)
  - [UPICheckoutButton](#upicheckoutbutton)
  - [UPIQRCode](#upiqrcode)
  - [UPIMerchantDashboard](#upimerchantdashboard)
  - [OpenUPILogo](#openupilogo)
  - [useUPIStatus Hook](#useupistatushook)
- [TypeScript API Reference](#typescript-api-reference)
- [Troubleshooting](#troubleshooting)

---

## Installation

```bash
npm install openupi-sdk
# or
yarn add openupi-sdk
# or
pnpm add openupi-sdk
```

> **Note:** React is an optional peer dependency. If you only use the Node.js backend client, React is not installed automatically.

---

## Subpath Exports

| Import path | Contents | Environment |
|---|---|---|
| `openupi-sdk` | `OpenUPI` client, `verifyWebhookSignature`, all TypeScript types | Node.js (server) |
| `openupi-sdk/node` | All of root **+** Express / Next.js / Fastify / generic webhook handlers | Node.js (server) |
| `openupi-sdk/react` | `OpenUPIProvider`, `UPICheckoutModal`, `UPIQRCode`, `UPICheckoutButton`, `UPIMerchantDashboard`, `OpenUPILogo`, `useUPIStatus` | React (client) |

---

## Environment Variables

Set these in your backend `.env` file:

```env
# Required — your gateway instance base URL
OPENUPI_GATEWAY_URL=https://pay.yourdomain.com

# Required — merchant API secret key (set in android daemon: Credentials tab)
OPENUPI_API_KEY=your_merchant_secret_key_here

# Optional — your merchant UPI VPA (e.g. yourbusiness@okaxis)
OPENUPI_MERCHANT_VPA=yourbusiness@okaxis
```

> ⚠️ **Never expose `OPENUPI_API_KEY` to the browser.** The `UPIMerchantDashboard` component accepts `apiKey` for admin panels behind auth — do not use it on public-facing pages.

---

## Quick Start: End-to-End Flow

```
[Customer Clicks "Pay"] → [Your backend creates order] → [Frontend shows QR + listens for SSE]
        ↓                                                           ↓
[Customer scans/pays]   →  [Android Daemon detects SMS credit]  → [SSE fires PAID]
        ↓                                                           ↓
[Webhook sent to your server]  →  [Verify HMAC]  →  [Fulfill order]
```

### Step 1 — Backend creates an order

```typescript
// pages/api/checkout.ts  (Next.js Pages Router)
// app/api/checkout/route.ts  (Next.js App Router)
import { OpenUPI } from 'openupi-sdk';

const upi = new OpenUPI({
  apiUrl: process.env.OPENUPI_GATEWAY_URL!,
  apiKey: process.env.OPENUPI_API_KEY!,
});

export async function POST(req: Request) {
  const { cartTotal, orderId } = await req.json();

  const order = await upi.orders.create({
    orderId,                                     // your system's order ID (must be unique)
    amount: cartTotal,                           // in INR, e.g. 499
    note: 'Pro Plan Purchase',                   // shown on payer's UPI screen
    callbackUrl: 'https://yourdomain.com/api/webhooks/openupi',
  });

  // order = { orderId, baseAmount, exactAmount, vpa, upiIntent, qrSvg, expiresAt }
  return Response.json(order);
}
```

### Step 2 — Frontend shows checkout

```tsx
// components/CheckoutDialog.tsx
'use client';
import { UPICheckoutModal } from 'openupi-sdk/react';

export function CheckoutDialog({ order, onClose }) {
  return (
    <UPICheckoutModal
      orderId={order.orderId}
      exactAmount={order.exactAmount}
      qrSvg={order.qrSvg}
      upiIntent={order.upiIntent}
      gatewayUrl={process.env.NEXT_PUBLIC_GATEWAY_URL!}
      onSuccess={({ utr }) => {
        // SSE confirmed payment — redirect or show success UI
        onClose();
        window.location.href = `/success?utr=${utr}`;
      }}
      onExpire={() => {
        alert('QR expired. Please start a new checkout.');
        onClose();
      }}
    />
  );
}
```

### Step 3 — Backend webhook to confirm

```typescript
// app/api/webhooks/openupi/route.ts
import { createNextWebhookHandler } from 'openupi-sdk/node';
import { db } from '@/lib/db';

export const POST = createNextWebhookHandler({
  secret: process.env.OPENUPI_API_KEY!,
  onPaymentSuccess: async (event) => {
    // event = { orderId, baseAmount, exactAmount, utr, status }
    await db.orders.update({
      where: { id: event.orderId },
      data: { status: 'PAID', paidAt: new Date(), utr: event.utr },
    });
    // send confirmation email, activate subscription, etc.
  },
  onPaymentLate: async (event) => {
    // Payment arrived after QR expiry — still valid, settle manually
    await db.orders.update({
      where: { id: event.orderId },
      data: { status: 'PAID_LATE', utr: event.utr },
    });
  },
});
```

---

## Backend SDK (Node.js)

### 1. Initialize the Client

```typescript
import { OpenUPI } from 'openupi-sdk';

const upi = new OpenUPI({
  apiUrl: process.env.OPENUPI_GATEWAY_URL!,   // required
  apiKey: process.env.OPENUPI_API_KEY!,        // required
  // merchantVpa?: 'yourname@okaxis',           // optional override
  // merchantName?: 'My Store',                 // optional override
});
```

### 2. Create a Payment Order

```typescript
const order = await upi.orders.create({
  orderId: 'ORD_1001',        // unique ID from your system
  amount: 499,                 // in INR (paise slot auto-allocated)
  note: 'Pro Plan',            // optional: shown on payer's UPI screen
  callbackUrl: 'https://yourdomain.com/api/webhooks/openupi',  // optional
  customerVpa: 'customer@okhdfcbank',  // optional: for collect requests
});

// Returns: OrderResponse
// {
//   orderId: 'ORD_1001',
//   baseAmount: 499,
//   exactAmount: 499.04,     // unique paise slot for matching
//   vpa: 'merchant@upi',
//   upiIntent: 'upi://pay?pa=merchant@upi&pn=My+Store&am=499.04&...',
//   qrSvg: '<svg>...</svg>', // embed directly in img or dangerouslySetInnerHTML
//   expiresAt: '2026-08-15T11:30:00.000Z'
// }
```

### 3. Poll or Stream Order Status

```typescript
// One-time poll
const status = await upi.orders.get('ORD_1001');
// status.status === 'PENDING' | 'PAID' | 'EXPIRED' | 'PAID_LATE'
// status.utr    === '422812345678' (when PAID)

// SSE stream URL — pass to frontend or use EventSource server-side
const streamUrl = upi.orders.streamUrl('ORD_1001');
// 'https://pay.yourdomain.com/api/v1/orders/ORD_1001/stream'
```

### 4. Manual UTR Claim (Customer Fallback)

```typescript
// When a customer pays but SSE didn't fire (rare)
const result = await upi.orders.claimUtr('ORD_1001', '422812345678');
// result.success === true if matched
// result.status  === 'PAID'
```

### 5. Admin: Stats & Transaction Ledger

```typescript
// Overall gateway stats
const stats = await upi.admin.stats();
// { settledVolume: 49823.00, settledCount: 101, pendingCount: 3, unmatchedCount: 1 }

// Paginated transaction ledger
const { transactions, total, page, limit } = await upi.admin.transactions({
  limit: 20,
  page: 1,
  status: 'PAID',   // optional filter: 'PAID' | 'PENDING' | 'EXPIRED'
});

// CSV export URL
const csvUrl = upi.admin.exportCsvUrl();
```

### 6. Admin: Reconcile Unmatched Bank Credits

```typescript
// Credits received without a matching order (e.g., paise mismatch)
const { unmatched } = await upi.admin.unmatched();

// Manually link a credit to an order
await upi.admin.reconcile(unmatched[0].id, 'ORD_1001');
```

### 7. Verify Webhooks Manually

```typescript
import { verifyWebhookSignature } from 'openupi-sdk';

const isValid = verifyWebhookSignature({
  rawBody: req.body.toString(),    // MUST be raw bytes string before parsing
  signature: req.headers['x-openupi-signature'] as string,
  timestamp:  req.headers['x-openupi-timestamp'] as string,
  secret: process.env.OPENUPI_API_KEY!,
  toleranceMs: 300_000,           // optional: 5 min replay window (default)
});

if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

const event = JSON.parse(req.body.toString());
// event.orderId, event.utr, event.status, event.baseAmount, event.exactAmount
```

> **How the signature works:** `HMAC-SHA256(body + "." + timestamp, secret)` — timing-safe comparison with 5-minute replay protection.

### 8. Express Webhook Handler

```typescript
import express from 'express';
import { createExpressWebhookHandler } from 'openupi-sdk/node';

const app = express();

// ⚠️ IMPORTANT: Use express.raw() — NOT express.json() — for this route
app.post(
  '/api/webhooks/openupi',
  express.raw({ type: '*/*' }),
  createExpressWebhookHandler({
    secret: process.env.OPENUPI_API_KEY!,
    onPaymentSuccess: async (event) => {
      console.log(`✅ Order ${event.orderId} paid | UTR: ${event.utr}`);
      await fulfillOrder(event.orderId);
    },
    onPaymentLate: async (event) => {
      // Optional: handle late payments after QR expiry
      await fulfillOrder(event.orderId);
    },
    onError: (err) => {
      console.error('[OpenUPI Webhook Error]', err);
    },
    toleranceMs: 300_000,  // optional, default 5 min
  })
);
```

### 9. Next.js App Router Webhook Handler

```typescript
// app/api/webhooks/openupi/route.ts
import { createNextWebhookHandler } from 'openupi-sdk/node';

export const POST = createNextWebhookHandler({
  secret: process.env.OPENUPI_API_KEY!,
  onPaymentSuccess: async (event) => {
    await db.orders.update({
      where: { id: event.orderId },
      data: { status: 'PAID', utr: event.utr, paidAt: new Date() },
    });
  },
});
```

> **Next.js Config:** Disable body parsing for this route so the raw body is preserved for HMAC:
> ```typescript
> // app/api/webhooks/openupi/route.ts — no extra config needed for App Router
> // For Pages Router only, export:
> export const config = { api: { bodyParser: false } };
> ```

### 10. Fastify Webhook Handler

```typescript
import Fastify from 'fastify';
import { createFastifyWebhookHandler } from 'openupi-sdk/node';

const app = Fastify();

// Tell Fastify to pass raw Buffer (required for HMAC verification)
app.addContentTypeParser(
  'application/json',
  { parseAs: 'buffer' },
  (_req, body, done) => done(null, body)
);

app.post('/api/webhooks/openupi', createFastifyWebhookHandler({
  secret: process.env.OPENUPI_API_KEY!,
  onPaymentSuccess: async (event) => {
    console.log(`✅ ${event.orderId} paid via UTR ${event.utr}`);
  },
}));

app.listen({ port: 3000 });
```

### 11. Framework-Agnostic Webhook Processor

For Hono, Bun.serve, Deno, or any custom HTTP server:

```typescript
import { processWebhookPayload } from 'openupi-sdk/node';

// Hono example
app.post('/api/webhooks/openupi', async (c) => {
  const rawBody = await c.req.text();

  let event;
  try {
    event = processWebhookPayload({
      rawBody,
      signature: c.req.header('x-openupi-signature') ?? '',
      timestamp: c.req.header('x-openupi-timestamp') ?? '',
      secret: process.env.OPENUPI_API_KEY!,
    });
  } catch {
    return c.json({ error: 'Invalid signature' }, 401);
  }

  await fulfillOrder(event.orderId, event.utr);
  return c.json({ received: true });
});
```

---

## Frontend SDK (React)

### OpenUPI Provider

Initialize once at your app root to avoid passing `gatewayUrl` as a prop to every component:

```tsx
// app/layout.tsx  or  pages/_app.tsx
import { OpenUPIProvider } from 'openupi-sdk/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <OpenUPIProvider gatewayUrl={process.env.NEXT_PUBLIC_GATEWAY_URL!}>
          {children}
        </OpenUPIProvider>
      </body>
    </html>
  );
}
```

Then access the config anywhere:

```tsx
import { useOpenUPIContext } from 'openupi-sdk/react';

function MyCheckout({ order }) {
  const { gatewayUrl } = useOpenUPIContext();

  return (
    <UPICheckoutModal
      gatewayUrl={gatewayUrl}
      orderId={order.orderId}
      exactAmount={order.exactAmount}
      qrSvg={order.qrSvg}
      upiIntent={order.upiIntent}
      onSuccess={({ utr }) => console.log('Paid!', utr)}
    />
  );
}
```

---

### UPICheckoutModal

The all-in-one payment widget. Renders the QR code, countdown timer, mobile pay button, and real-time payment status — and auto-triggers `onSuccess` when payment is confirmed via SSE.

```tsx
import { UPICheckoutModal } from 'openupi-sdk/react';

<UPICheckoutModal
  orderId="ORD_1001"
  exactAmount={499.04}
  qrSvg={order.qrSvg}
  upiIntent={order.upiIntent}
  gatewayUrl="https://pay.yourdomain.com"
  onSuccess={({ utr }) => {
    // Called automatically when SSE confirms PAID or PAID_LATE
    router.push(`/thank-you?utr=${utr}`);
  }}
  onExpire={() => {
    // Called when the 15-minute QR window expires
    setShowModal(false);
  }}
/>
```

| Prop | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | ✅ | Order ID from `upi.orders.create()` |
| `exactAmount` | `number` | ✅ | Exact paise-slotted amount (e.g. `499.04`) |
| `qrSvg` | `string` | ✅ | SVG string from order response |
| `upiIntent` | `string` | ✅ | Deep-link for mobile UPI apps |
| `gatewayUrl` | `string` | ✅ | Your gateway base URL |
| `onSuccess` | `({ utr }) => void` | ✅ | Called on PAID or PAID_LATE |
| `onExpire` | `() => void` | ❌ | Called on QR timeout (15 min) |

---

### UPICheckoutButton

A styled anchor tag that deep-links to a UPI payment app on mobile.

```tsx
import { UPICheckoutButton } from 'openupi-sdk/react';

<UPICheckoutButton
  upiIntent={order.upiIntent}
  label="Pay ₹499 with UPI"
  style={{ width: '100%' }}
/>
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `upiIntent` | `string` | — | `upi://` deep link from order response |
| `label` | `string` | `'Pay via UPI App'` | Button text |
| `className` | `string` | — | Additional CSS class |
| `style` | `CSSProperties` | — | Inline style overrides |
| `onClick` | `() => void` | — | Optional click handler |

---

### UPIQRCode

Standalone QR code display with optional UPI ID copy button.

```tsx
import { UPIQRCode } from 'openupi-sdk/react';

<UPIQRCode
  qrSvg={order.qrSvg}
  exactAmount={order.exactAmount}
  vpa="yourbusiness@okaxis"   // optional: shows UPI ID with copy button
/>
```

| Prop | Type | Description |
|---|---|---|
| `qrSvg` | `string` | SVG string from order response |
| `exactAmount` | `number` | Displayed below QR |
| `vpa` | `string` | Optional UPI ID shown with copy button |
| `className` | `string` | Optional CSS class |
| `style` | `CSSProperties` | Optional style overrides |

---

### UPIMerchantDashboard

Drop a full admin dashboard widget into any authenticated admin page — shows settlement metrics, transaction ledger with pagination, daemon health, and CSV export.

```tsx
import { UPIMerchantDashboard } from 'openupi-sdk/react';

// In an authenticated admin page only
export default function AdminPage() {
  return (
    <UPIMerchantDashboard
      gatewayUrl="https://pay.yourdomain.com"
      apiKey={process.env.NEXT_PUBLIC_OPENUPI_ADMIN_KEY!}
      title="OpenUPI Console"       // optional, default: 'OpenUPI Merchant Console'
      refreshIntervalMs={10000}     // optional, default: 10000 (10s)
    />
  );
}
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `gatewayUrl` | `string` | — | Gateway base URL |
| `apiKey` | `string` | — | Admin API key (**behind auth only**) |
| `title` | `string` | `'OpenUPI Merchant Console'` | Dashboard header title |
| `refreshIntervalMs` | `number` | `10000` | Auto-refresh interval |

---

### OpenUPILogo

Official OpenUPI logo as crisp SVG. Supports icon mark and full brand name.

```tsx
import { OpenUPILogo } from 'openupi-sdk/react';

<OpenUPILogo size={32} variant="full" dark={false} />
// Renders: [hexagon icon] Open**UPI**
```

| Prop | Type | Default | Description |
|---|---|---|---|
| `size` | `number \| string` | `32` | Width/height in px |
| `variant` | `'mark' \| 'full'` | `'mark'` | Icon only vs icon + wordmark |
| `dark` | `boolean` | `false` | White icon on dark backgrounds |
| `className` | `string` | — | Optional CSS class |
| `style` | `CSSProperties` | — | Optional style overrides |

---

### useUPIStatus Hook

Headless SSE hook for building custom payment UIs. Reconnects automatically with exponential backoff on network drops.

```tsx
import { useUPIStatus } from 'openupi-sdk/react';

function CustomPaymentStatus({ orderId, gatewayUrl }) {
  const { status, utr, error } = useUPIStatus(gatewayUrl, orderId);

  return (
    <div>
      {status === 'PENDING'   && <Spinner label="Waiting for payment..." />}
      {status === 'PAID'      && <Success utr={utr!} />}
      {status === 'PAID_LATE' && <Success utr={utr!} label="Received (Late)" />}
      {status === 'EXPIRED'   && <Alert>QR Expired. Please retry.</Alert>}
      {status === 'ERROR'     && <Alert>Reconnecting... ({error})</Alert>}
    </div>
  );
}
```

**Returned state:**

| Field | Type | Description |
|---|---|---|
| `status` | `'PENDING' \| 'PAID' \| 'PAID_LATE' \| 'EXPIRED' \| 'ERROR'` | Current payment state |
| `utr` | `string \| undefined` | 12-digit bank UTR (present on PAID / PAID_LATE) |
| `error` | `string \| undefined` | Error message (present on ERROR) |

---

## TypeScript API Reference

### `OpenUPIConfig`
```typescript
interface OpenUPIConfig {
  apiUrl: string;          // Gateway base URL (required)
  apiKey: string;          // Merchant API secret key (required)
  merchantVpa?: string;    // Override merchant UPI VPA
  merchantName?: string;   // Override merchant display name
}
```

### `CreateOrderParams`
```typescript
interface CreateOrderParams {
  orderId: string;         // Unique order ID from your system
  amount: number;          // Base amount in INR
  note?: string;           // Payment note for payer
  callbackUrl?: string;    // Webhook URL for payment confirmation
  customerVpa?: string;    // Optional: customer UPI ID for collect
}
```

### `OrderResponse`
```typescript
interface OrderResponse {
  orderId: string;
  baseAmount: number;      // Original amount (e.g. 499)
  exactAmount: number;     // Paise-slotted amount (e.g. 499.04)
  vpa: string;             // Merchant UPI ID
  upiIntent: string;       // upi:// deep link
  qrSvg: string;           // SVG string for QR rendering
  expiresAt: string;       // ISO 8601 expiry timestamp
}
```

### `OrderStatusResponse`
```typescript
interface OrderStatusResponse {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'PAID_LATE';
  utr?: string;            // Bank UTR (present when PAID)
  paidAt?: string;         // ISO 8601 (present when PAID)
  expiresAt: string;
  createdAt: string;
}
```

### `PaymentWebhookPayload`
```typescript
interface PaymentWebhookPayload {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  utr: string;             // 12-digit Unique Transaction Reference
  status: 'PAID' | 'FAILED' | 'EXPIRED' | 'PAID_LATE';
}
```

### `WebhookHandlerOptions`
```typescript
interface WebhookHandlerOptions {
  secret: string;
  onPaymentSuccess: (event: PaymentWebhookPayload) => Promise<void> | void;
  onPaymentLate?: (event: PaymentWebhookPayload) => Promise<void> | void;
  onError?: (err: Error) => void;
  toleranceMs?: number;    // default: 300000 (5 min)
}
```

---

## Troubleshooting

### ❌ `Cannot find module 'openupi-sdk/react'`
Ensure you have `react >= 18` installed and your bundler resolves the `exports` field (Webpack 5+, Vite, Rollup, esbuild all do this by default).

### ❌ Webhook returns `401 Invalid signature`
- Ensure you're using `express.raw({ type: '*/*' })` **before** `express.json()` for this route.
- Do **not** parse the body before the handler reads it. The raw bytes must reach the verifier.
- In Next.js Pages Router: add `export const config = { api: { bodyParser: false } }`.

### ❌ SSE disconnects immediately
Check that your gateway allows long-lived HTTP connections (not timing out at 30s). If behind Nginx, add:
```nginx
proxy_read_timeout 3600s;
proxy_buffering    off;
```

### ❌ `useOpenUPIContext()` throws
You must wrap your component tree with `<OpenUPIProvider gatewayUrl="...">`. It can be placed in your root layout or just around the checkout section.

### ❌ QR amount mismatch
Always pass `order.exactAmount` (e.g. `499.04`) to the UI — not `baseAmount` (e.g. `499`). The paise slot is how OpenUPI identifies which payment belongs to which order.

---

## Building and Testing

```bash
npm run build       # Bundles dual ESM/CJS with .d.ts into dist/
npm run test        # Runs Vitest test suite (16 tests)
npm run typecheck   # Validates TypeScript without emitting
npm run dev         # Watch mode build
```

---

## License

MIT © [Sayan Senapati](https://github.com/senapati484)
