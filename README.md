<p align="center">
  <img src="public/openupi.png" width="140" height="140" alt="OpenUPI Logo" style="border-radius: 20%;" />
</p>

<h1 align="center">OpenUPI</h1>

<p align="center">
  <b>Zero-Fee, Self-Hosted UPI Payment Gateway for Merchants & Developers</b><br />
  Direct settlement into your bank account. No middlemen. Fully automated order matching.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/openupi-sdk"><img src="https://img.shields.io/npm/v/openupi-sdk?color=blue&label=npm%20openupi-sdk" alt="npm openupi-sdk" /></a>
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-purple.svg" alt="License: MIT" /></a>
</p>

---

## 💡 How It Works

```
 ┌────────────────────────┐
 │   Customer on Website  │
 │  (Scans dynamic QR)    │
 └───────────┬────────────┘
             │ 1. Pays exact paise amount (e.g. ₹499.04) via GPay/PhonePe/Paytm
             ▼
 ┌────────────────────────┐
 │   Merchant Bank / UPI  │
 └───────────┬────────────┘
             │ 2. Sends Credit SMS / App Notification
             ▼
 ┌────────────────────────┐
 │  OpenUPI Android App   │  ◄── Download APK from SourceForge / GitHub
 │  (SMS/Notif Intercept) │
 └───────────┬────────────┘
             │ 3. HMAC-signed POST dispatch (Offline queue + TTS alert)
             ▼
 ┌────────────────────────┐
 │  OpenUPI Backend Server│  ◄── 1 Docker container running 24/7
 │  (Fastify + Redis + DB)│
 └───────────┬────────────┘
             │ 4. Deterministic matching + Real-time SSE push + Webhook
             ▼
 ┌────────────────────────┐
 │  Merchant Store / App  │  ◄── Integrated with `openupi-sdk` (npm)
 │  (Order Confirmed ✓)   │
 └────────────────────────┘
```

---

## ⚡ The 3-Step Setup

### Step 1: Run the Backend Gateway (Takes 1 minute)

Run the single-container backend server on your VPS, local machine, or home server:

```bash
# 1. Clone repository
git clone https://github.com/senapati484/openupi.git
cd openupi

# 2. Configure environment
cp .env.example .env
# Open .env and set:
#   MERCHANT_VPA=yourbusiness@okaxis
#   MERCHANT_NAME="My Business"
#   DEVICE_SHARED_SECRET=your_secret_key_32_chars
#   MERCHANT_API_KEY=sk_live_your_api_key_16_chars

# 3. Start server with Docker
docker compose -f docker/docker-compose.yml up -d
```

*(Your gateway API will be live on `http://YOUR_SERVER_IP:4000`, with admin dashboard on `http://YOUR_SERVER_IP:3000`)*

---

### Step 2: Download & Pair the Android App

1. **Download APK**: Download the **OpenUPI Daemon APK** from [SourceForge](https://sourceforge.net/projects/openupi/) or [GitHub Releases](https://github.com/senapati484/openupi/releases).
2. Install on any Android device (Android 8+) with the SIM card that receives your bank SMS or has UPI apps installed.
3. Open the app and grant:
   - **SMS Permission** (`RECEIVE_SMS`) — for native bank credit SMS.
   - **Notification Access** — for GPay, PhonePe, Paytm push notifications.
   - **Battery Optimization Exemption** — ensures 24/7 background operation.
4. Enter your **Server URL** (e.g. `https://pay.yourdomain.com`) and **Device Shared Secret**.
5. Keep the phone plugged in and connected to Wi-Fi.

---

### Step 3: Install `openupi-sdk` on Your Website / App

```bash
npm install openupi-sdk
```

#### A. Backend: Create Payment Order & Verify Webhooks (Node.js / Express / Next.js API)

```typescript
import { OpenUPI, verifyWebhookSignature } from 'openupi-sdk';

const upi = new OpenUPI({
  apiUrl: 'https://pay.yourdomain.com',
  apiKey: process.env.OPENUPI_API_KEY!,
});

// 1. Create a payment order with unique paise offset (e.g. ₹499.04)
app.post('/api/checkout', async (req, res) => {
  const order = await upi.orders.create({
    orderId: `ORD_${Date.now()}`,
    amount: 499,
    note: 'Pro Plan Upgrade',
    callbackUrl: 'https://yourdomain.com/api/webhooks/openupi',
  });

  res.json({ order });
});

// 2. Webhook endpoint: Called automatically when payment is confirmed
app.post('/api/webhooks/openupi', express.raw({ type: '*/*' }), (req, res) => {
  const isValid = verifyWebhookSignature({
    rawBody: req.body.toString(),
    signature: req.headers['x-openupi-signature'] as string,
    timestamp: req.headers['x-openupi-timestamp'] as string,
    secret: process.env.OPENUPI_API_KEY!,
  });

  if (!isValid) return res.status(401).send('Unauthorized');

  const payload = JSON.parse(req.body.toString());
  console.log(`Payment confirmed! Order: ${payload.orderId}, UTR: ${payload.utr}`);

  // Unlock user subscription / fulfill order
  res.json({ received: true });
});
```

#### B. Frontend: Drop-In React Checkout Widget (React / Next.js)

```tsx
import { UPICheckoutModal, UPICheckoutButton } from 'openupi-sdk/react';

export function CheckoutModal({ order, onClose }) {
  return (
    <UPICheckoutModal
      orderId={order.orderId}
      exactAmount={order.exactAmount}
      qrSvg={order.qrSvg}
      upiIntent={order.upiIntent}
      gatewayUrl="https://pay.yourdomain.com"
      onSuccess={({ utr }) => {
        alert(`Payment successful! UTR: ${utr}`);
        window.location.href = '/dashboard';
      }}
      onExpire={() => {
        alert('Order expired. Please regenerate QR.');
      }}
    />
  );
}
```

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| 💸 **0% Transaction Fees** | Money settles directly from customer's bank account to yours. |
| ⚡ **Sub-Second Confirmation** | Android daemon dispatches within ~300ms of receiving SMS/notification. |
| 🛡️ **Replay & Timing-Safe Security** | HMAC-SHA256 device authentication with strict 5-minute timestamp drift window. |
| 📱 **Dual Redundancy Interception** | Native SMS (`Telephony.SMS_RECEIVED`) + Notification Listener (`NotificationListenerService`). |
| 🔊 **Built-in Soundbox TTS** | Audio announcement through phone speaker ("Received ₹499 on UPI"). |
| 🔄 **Offline Queue with Retry** | Room DB queue on device retries dispatches when phone regains internet. |
| 📊 **Admin Dashboard** | Real-time transaction ledger, unmatched credit resolver, daemon battery telemetry, and CSV export. |
| 🛒 **WooCommerce Plugin** | Ready-to-use WordPress plugin included in `plugins/openupi-woocommerce/`. |

---

## 📁 Repository Structure

```
openupi/
├── apps/
│   ├── backend-server/          # Fastify + MongoDB + Redis + BullMQ Gateway
│   ├── android-daemon/          # Kotlin Android Daemon App (SMS/Push Listener)
│   └── dashboard/               # Next.js 14 Admin Control Panel
├── packages/
│   └── openupi-sdk/             # Official npm SDK (Node client + React widgets)
├── plugins/
│   └── openupi-woocommerce/      # WordPress / WooCommerce Payment Plugin
├── examples/
│   └── merchant-store/          # Complete Express + React store integration demo
├── docker/                      # Multi-stage Dockerfile & docker-compose.yml
├── scripts/
│   ├── install.sh               # 1-command VPS installer
│   └── test-e2e.ts              # E2E simulation script
└── tests/                       # Multi-bank SMS & notification test suite
```

---

## 🛠️ API Reference

| Method & Path | Auth | Description |
|---|---|---|
| `POST /api/v1/orders/create` | `x-api-key` | Create payment order with exact paise allocation |
| `GET /api/v1/orders/:id/status` | `x-api-key` | Query order status (`PENDING`, `PAID`, `EXPIRED`) |
| `GET /api/v1/orders/:id/stream` | None | Server-Sent Events (SSE) stream for real-time frontend updates |
| `POST /api/v1/internal/ingest` | HMAC | Android daemon payment dispatch endpoint |
| `POST /api/v1/internal/heartbeat` | HMAC | Daemon liveness, battery %, and connectivity ping |
| `GET /api/v1/admin/transactions` | `x-api-key` | Paginated transaction ledger |
| `GET /api/v1/admin/unmatched` | `x-api-key` | List unmatched bank credits |
| `POST /api/v1/admin/reconcile` | `x-api-key` | Manually match an unmatched credit to an order |
| `GET /api/v1/admin/export/csv` | `x-api-key` | Download CSV accounting ledger |
| `GET /health` | None | Gateway & daemon health check |

---

## ⚠️ Notes & Production Best Practices

1. **Current Account (P2M)**: It is recommended to use a Current Bank Account (P2M VPA) to avoid P2P transaction count limits.
2. **Dedicated Android Device**: Keep a dedicated Android phone connected to power and Wi-Fi 24/7.
3. **Paise Offsets**: OpenUPI uses 2-decimal offsets (`.01` to `.99`), supporting up to 99 concurrent unpaid orders of the exact same base amount per VPA.
4. **Refunds**: Since UPI push transactions do not provide programmatic pull/refund APIs, refunds are processed via reverse UPI intent.

---

## 📄 License

MIT License © 2026 Sayan Senapati. Free and open-source for personal and commercial use.
