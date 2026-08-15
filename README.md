# OpenUPI — Self-Hosted Zero-Fee UPI Payment Gateway

> Accept UPI payments on your own server. No payment gateway fees. No middlemen. Full control.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue.svg)](docker/docker-compose.yml)

---

## How It Works

1. **Android Daemon** — An Android app installed on a dedicated phone listens to bank SMS and UPI app notifications.
2. **Paise Offset** — Each order gets a unique exact amount (e.g. ₹99.04 instead of ₹99.00), enabling deterministic matching.
3. **Backend Server** — Fastify + MongoDB + Redis matches incoming bank credits to pending orders in milliseconds.
4. **Webhook Delivery** — BullMQ delivers a signed webhook to your application (5 retries, exponential backoff).
5. **Dashboard** — Admin web panel to view transactions, unmatched credits, reconcile manually, and export ledger CSV.

## Architecture

```
Customer → UPI App → Bank → [Bank Notification on Android Phone]
                                    ↓
                         Android Daemon (HMAC-signed POST)
                                    ↓
              Fastify Backend → Redis Paise Locker → MongoDB Matching
                                    ↓
                        BullMQ → Your Webhook Endpoint
```

## Monorepo Structure

```
open-upi/
├── apps/
│   ├── backend-server/     # Fastify TypeScript API
│   └── android-daemon/     # Kotlin notification listener app
├── packages/
│   └── openupi-sdk/        # openupi-sdk — dual ESM/CJS npm package with /react subpath
├── plugins/
│   └── openupi-woocommerce/ # WordPress/WooCommerce plugin
├── docker/                 # Dockerfile + docker-compose.yml
├── scripts/                # install.sh + test-e2e.ts
├── tests/                  # Vitest test suite
└── .github/workflows/      # CI/CD — test, Docker push, npm publish
```

## Quick Start

### 1. Server (VPS/Ubuntu)

```bash
curl -fsSL https://raw.githubusercontent.com/yourname/open-upi/main/scripts/install.sh | sudo bash
```

Or manually:

```bash
git clone https://github.com/yourname/open-upi
cd open-upi
cp .env.example .env
# Edit .env: set MERCHANT_VPA, MERCHANT_NAME, generate secrets
docker compose -f docker/docker-compose.yml up -d
```

### 2. Android App

1. Open `apps/android-daemon` in Android Studio.
2. Build and install on a **dedicated Android phone** (Android 8+).
3. Grant **Notification Listener** permission.
4. Enter your server URL and Device Secret in the app.
5. Request battery optimization exemption.
6. Place the phone on charge — it must stay plugged in 24/7.

### 3. Integrate (Node.js)

```bash
npm install openupi-sdk
```

```typescript
import { OpenUPI } from 'openupi-sdk';

const upi = new OpenUPI({
  apiUrl: 'https://pay.yourdomain.com',
  apiKey: process.env.OPENUPI_API_KEY!,
});

// Create a payment order
const order = await upi.orders.create({ orderId: 'ORD_001', amount: 499 });
// → { exactAmount: 499.04, qrSvg: '...', upiIntent: 'upi://pay?...' }
```

### 4. Verify Webhooks

```typescript
import { verifyWebhookSignature } from 'openupi-sdk';

app.post('/webhook', express.raw({ type: '*/*' }), (req, res) => {
  const valid = verifyWebhookSignature({
    rawBody: req.body.toString(),
    signature: req.headers['x-openupi-signature'] as string,
    timestamp: req.headers['x-openupi-timestamp'] as string,
    secret: process.env.OPENUPI_API_KEY!,
  });
  if (!valid) return res.status(401).send('Unauthorized');
  // Mark order as paid
  res.json({ received: true });
});
```

### 5. Frontend Checkout (React / Next.js)

```tsx
import { UPICheckoutModal } from 'openupi-sdk/react';

<UPICheckoutModal
  orderId={order.orderId}
  exactAmount={order.exactAmount}
  qrSvg={order.qrSvg}
  upiIntent={order.upiIntent}
  gatewayUrl="https://pay.yourdomain.com"
  onSuccess={({ utr }) => console.log('Paid:', utr)}
/>
```

## API Reference

| Endpoint | Auth | Description |
|---|---|---|
| `POST /api/v1/orders/create` | `x-api-key` | Create payment order + QR |
| `GET /api/v1/orders/:id/status` | `x-api-key` | Check order status |
| `GET /api/v1/orders/:id/stream` | None | SSE real-time status stream |
| `POST /api/v1/internal/ingest` | HMAC | Android daemon payment report |
| `POST /api/v1/internal/heartbeat` | HMAC | Android daemon liveness ping |
| `GET /api/v1/admin/transactions` | `x-api-key` | Paginated transaction ledger |
| `GET /api/v1/admin/unmatched` | `x-api-key` | Unmatched credits list |
| `POST /api/v1/admin/reconcile` | `x-api-key` | Manual reconciliation |
| `GET /api/v1/admin/export/csv` | `x-api-key` | Download CSV ledger |
| `GET /health` | None | Gateway health check |

## Limitations

- **Capacity**: Max 99 concurrent orders at the same base amount per VPA.
- **Refunds**: Manual only (reverse UPI intent — customer must scan a new QR).
- **Reliability**: Requires a dedicated Android device, plugged in, connected to Wi-Fi 24/7.
- **Compliance**: Use a Current Account (P2M) — P2P limits apply on savings accounts.

## License

MIT — built for developers who want full control over their payment infrastructure.
