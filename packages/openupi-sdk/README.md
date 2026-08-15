# openupi-sdk

> Universal JavaScript / TypeScript SDK & React UI widgets for OpenUPI — zero-fee self-hosted UPI payment gateway.

Dual ESM/CJS support with optimized subpath exports:
- `openupi-sdk` (Root): Node.js client, order creation, transaction ledgers, HMAC webhook verification, and core TypeScript interfaces.
- `openupi-sdk/react`: Drop-in checkout widgets (`UPICheckoutModal`, `UPICheckoutButton`, `UPIQRCode`), prebuilt admin dashboard (`UPIMerchantDashboard`), and headless SSE status hook (`useUPIStatus`).

---

## Installation

```bash
npm install openupi-sdk
```

*(Note: If you only use the Node.js backend client, React is an optional peer dependency and will not be installed.)*

---

## Backend Usage (Node.js / Express / Fastify / Next.js)

### 1. Initialize Client & Create Order

```typescript
import { OpenUPI } from 'openupi-sdk';

const upi = new OpenUPI({
  apiUrl: 'https://pay.yourdomain.com',
  apiKey: process.env.OPENUPI_API_KEY!,
});

// Create payment order with deterministic paise allocation
const order = await upi.orders.create({
  orderId: 'ORD_1001',
  amount: 499,
  note: 'Pro Plan Subscription',
  callbackUrl: 'https://yourdomain.com/api/webhooks/openupi',
});

console.log(order);
// {
//   orderId: 'ORD_1001',
//   baseAmount: 499,
//   exactAmount: 499.04,
//   vpa: 'merchant@upi',
//   upiIntent: 'upi://pay?pa=...',
//   qrSvg: '<svg>...</svg>',
//   expiresAt: '2026-08-15T10:00:00.000Z'
// }
```

### 2. Verify Webhooks (HMAC-SHA256 Timing-Safe)

```typescript
import { verifyWebhookSignature } from 'openupi-sdk';

app.post('/api/webhooks/openupi', express.raw({ type: '*/*' }), (req, res) => {
  const isValid = verifyWebhookSignature({
    rawBody: req.body.toString(),
    signature: req.headers['x-openupi-signature'] as string,
    timestamp: req.headers['x-openupi-timestamp'] as string,
    secret: process.env.OPENUPI_API_KEY!,
    toleranceMs: 300000, // 5 minutes
  });

  if (!isValid) {
    return res.status(401).send('Invalid signature or expired timestamp');
  }

  const payload = JSON.parse(req.body.toString());
  // Process successful payment: payload.orderId, payload.utr, payload.status
  res.json({ received: true });
});
```

### 3. Query Transaction Ledgers & Admin Stats

```typescript
// Get overall gateway volume & stats
const stats = await upi.admin.stats();

// Fetch paginated transaction history
const { transactions, total } = await upi.admin.transactions({ limit: 20, page: 1 });

// Reconcile an unmatched bank credit manually
await upi.admin.reconcile('unmatched_id_123', 'ORD_1001');
```

---

## Frontend Usage (React / Next.js)

### 1. Drop-In Checkout Modal Widget

```tsx
import { UPICheckoutModal } from 'openupi-sdk/react';

export function CheckoutPage({ order }) {
  return (
    <UPICheckoutModal
      orderId={order.orderId}
      exactAmount={order.exactAmount}
      qrSvg={order.qrSvg}
      upiIntent={order.upiIntent}
      gatewayUrl="https://pay.yourdomain.com"
      onSuccess={({ utr }) => {
        alert(`Payment successful! UTR: ${utr}`);
      }}
      onExpire={() => {
        alert('Payment window expired. Please retry.');
      }}
    />
  );
}
```

### 2. Prebuilt Admin Dashboard Widget (`<UPIMerchantDashboard />`)

Drop a complete real-time transaction ledger and metrics panel into any admin page with one line of code:

```tsx
import { UPIMerchantDashboard } from 'openupi-sdk/react';

export default function AdminPage() {
  return (
    <UPIMerchantDashboard
      gatewayUrl="https://pay.yourdomain.com"
      apiKey={process.env.NEXT_PUBLIC_OPENUPI_KEY!}
    />
  );
}
```

### 3. Standalone QR Code Component (`<UPIQRCode />`)

```tsx
import { UPIQRCode } from 'openupi-sdk/react';

<UPIQRCode
  qrSvg={order.qrSvg}
  exactAmount={order.exactAmount}
  vpa="yourbusiness@okaxis"
/>
```

### 4. Headless SSE Hook (`useUPIStatus`)

```tsx
import { useUPIStatus } from 'openupi-sdk/react';

export function CustomPaymentStatus({ orderId }) {
  const { status, utr, error } = useUPIStatus('https://pay.yourdomain.com', orderId);

  if (status === 'PAID') return <div>Payment Received! UTR: {utr}</div>;
  if (status === 'EXPIRED') return <div>Order Expired</div>;
  if (status === 'ERROR') return <div>Error: {error}</div>;

  return <div>Waiting for payment...</div>;
}
```

---

## Building and Testing

```bash
npm run build     # Bundles dual ESM/CJS with DTS into dist/
npm run test      # Runs Vitest test suite
npm run typecheck # Validates TypeScript types
```

---

## License

MIT © Sayan Senapati
