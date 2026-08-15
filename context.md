# OpenUPI — Comprehensive System Architecture & Project Context

> **Version:** 1.0.0  
> **Repository:** [https://github.com/senapati484/openupi.git](https://github.com/senapati484/openupi.git)  
> **Author / Maintainer:** Sayan Senapati  
> **License:** MIT  

---

## 1. Executive Summary & Vision

**OpenUPI** is a production-grade, 100% private, self-hosted UPI payment gateway and zero-cost smart soundbox system designed specifically for Indian merchants, developers, startups, and physical retailers.

### The Problem It Solves
Traditional Indian payment aggregators (Razorpay, Cashfree, PayU, Stripe India):
1. **Deduct 1.5% – 2.5% MDR + 18% GST** on every transaction.
2. **Impose delayed settlement cycles** (T+1 to T+3 business days), locking merchant working capital.
3. **Require extensive enterprise KYC** and business registration documentation.
4. **Charge ₹125 – ₹250/month rental fees** for physical audio soundbox devices (Paytm / PhonePe Soundbox).

### The OpenUPI Solution
1. **0% Transaction Fees (Zero MDR):** Customer funds settle directly, peer-to-peer (P2P) or peer-to-merchant (P2M), directly into the merchant's bank account with zero intermediate escrow.
2. **Instant Settlement:** Real-time bank credit confirmation in under 1 second.
3. **Dual Operation Modes:**
   - **Gateway Mode:** Full programmatic checkout API, dynamic QR generation, SSE streams, HMAC webhooks, React widgets, and WooCommerce plugin.
   - **Standalone Soundbox Mode:** **Zero server required!** Install on any spare Android phone to convert it into a free, high-volume audio soundbox that announces UPI credits out loud via TTS.
4. **100% Data Sovereignty:** Self-hosted on Docker (VPS/home server) with MongoDB and Redis.

---

## 2. Complete Application Theme & UI/UX Design System

The OpenUPI ecosystem across Android, Web Admin, and SDK widgets adheres to a **Tactical Dark Fintech** design aesthetic characterized by high visual contrast, crisp telemetry surfaces, glowing semantic status badges, and rapid visual comprehension.

### 2.1 Brand Identity & Vector Mark
- **Monogram Crest:** A precision hexagonal outer shield (`#0F172A` in light contexts, `#FFFFFF` in dark contexts) enclosing a stylized geometric "U" shape (`#0284C7` Sky Blue / White contrast).
- **Brand Typography:** Inter / SF Pro Display font hierarchy with tight tracking (`-0.03em`) and heavy weight (800).
- **Wordmark Styling:** `Open` (Dark Slate / Pure White) + `UPI` (`#0284C7` Sky Blue / Cyan Accent).

### 2.2 Color Palette & Semantic Design Tokens

| Token Name | Hex Code | Purpose / Usage |
|---|---|---|
| **Background Dark** | `#0B0F19` | Main Android canvas & body background |
| **Surface Dark (Card)** | `#1E293B` | Elevation 1 containers, cards, tables, sheets |
| **Surface Header** | `#131C2E` | Navigation bars, top app bars, elevated headers |
| **Border / Divider** | `#334155` | Subtle container outlines, table row dividers |
| **Accent Sky Blue** | `#38BDF8` | Primary active tabs, links, primary CTA buttons |
| **Brand Cobalt Blue** | `#0284C7` | Button gradients, vector mark accents, mobile pay links |
| **Success Emerald** | `#10B981` / `#065F46` | Settled metrics, verified UTRs, online daemon status badge |
| **Warning Amber** | `#F59E0B` / `#78350F` | Pending QRs, listening state, unconfirmed bank credits |
| **Danger Rose** | `#EF4444` / `#7F1D1D` | Unmatched credits, daemon offline alerts, expired sessions |
| **Text Primary** | `#F8FAFC` | Main headings, financial figures, primary labels |
| **Text Muted** | `#94A3B8` / `#64748B` | Subtitles, helper text, secondary metadata |
| **Code Surface** | `#0F172A` | Monospace UTR displays, logs, API keys, JSON snippets |

---

### 2.3 Platform-Specific UI Implementations

#### A. Android Daemon App (`apps/android-daemon`)
Built with **Jetpack Compose** and **Material 3 Dark Theme**:
- **Console Tab:** Real-time terminal log viewer with category color tags (`INFO`, `SMS`, `NOTIFICATION`, `DISPATCH`, `ERROR`), search filter, autoscroll lock, and buffer clearing.
- **Credentials Tab:** Clean separation into **Required Credentials** (Gateway Server URL, Device Shared Secret) and **Optional Settings** (Fallback Direct Webhook, Direct MongoDB URI, Merchant VPA Override, Merchant Name Override). Includes test connectivity ping and password-masked inputs.
- **Soundbox & Rules Tab:** 
  - Dedicated "Zero-Cost Soundbox" toggle with real-time TTS audio test ("Received ₹500 on UPI").
  - Speech rate and pitch slider controls.
  - Multi-bank keyword regex filter list (HDFC, SBI, ICICI, Axis, Paytm, PhonePe, Google Pay, BHIM, CRED).
- **Diagnostics Tab:** Real-time hardware telemetry display:
  - Battery percentage (`🔋 %`) & AC charging state (`⚡ Charging`).
  - KeepAlive foreground service status.
  - Notification Listener permission check with Android 13+ Restricted Settings direct link.
  - Battery Optimization exemption trigger.
  - Ingestion queue depth (Room DB pending dispatches).

#### B. Web Admin Dashboard (`apps/dashboard`)
Built with **Next.js 14 (App Router)** and **TailwindCSS / CSS Modules**:
- **Telemetry Header:** Real-time daemon heartbeat pill displaying connectivity status, battery level, and charging state.
- **Metric Cards Grid:** 4-column overview displaying *Total Settled Volume (₹)*, *Settled Transactions*, *Active Pending QRs*, and *Unmatched Credits*.
- **Transaction Ledger:** Paginated table with order IDs, timestamps, base amounts, exact paise amounts, bank UTRs, and status badges.
- **Accounting Exporter:** One-click CSV download for accounting reconciliation.

#### C. React SDK Widgets (`packages/openupi-sdk/react`)
- `<UPICheckoutModal />`: Floating checkout card with dynamic paise amount, auto-rendered SVG QR code, 15-minute countdown timer, mobile app deep-link, live SSE connection status, and collapsible manual 12-digit UTR input.
- `<UPIMerchantDashboard />`: Drop-in admin widget embedding full analytics and transaction tables into any merchant web portal.
- `<UPIQRCode />` & `<UPICheckoutButton />`: Headless/atomic UI primitives for custom merchant checkouts.

---

## 3. Monorepo Structure & File Organization

```
openupi/
├── apps/
│   ├── android-daemon/              # Android app: Notification/SMS listener, TTS soundbox, offline sync
│   │   ├── app/
│   │   │   ├── build.gradle         # Android build config (archivesBaseName = "openupi")
│   │   │   └── src/main/java/com/openupi/daemon/
│   │   │       ├── data/            # Room Database (QueueEntity, QueueDao, AppDatabase)
│   │   │       ├── network/         # Retrofit/OkHttp client + HMAC-SHA256 request signer
│   │   │       ├── parser/          # Regex bank engines (GenericSmsBankParser, UpiAppNotificationParser)
│   │   │       ├── receiver/        # SMS BroadcastReceiver (Telephony.SMS_RECEIVED), BootReceiver
│   │   │       ├── service/         # NotificationListenerService, PaymentAnnouncer (TTS), KeepAliveService
│   │   │       └── ui/              # Jetpack Compose UI (MainActivity.kt, LiveLogBus.kt)
│   │   └── README.md                # Android setup, Play Protect bypass, and permission guide
│   │
│   ├── backend-server/              # Fastify Gateway API server
│   │   ├── src/
│   │   │   ├── index.ts             # Server entry point, database hooks, CORS, health routes
│   │   │   ├── middleware/          # HMAC signature validator (verifyDeviceSignature) & API key auth
│   │   │   ├── models/              # Mongoose schemas (Order.ts, UnmatchedCredit.ts)
│   │   │   ├── routes/              # Fastify routes (orders.ts, ingest.ts, heartbeat.ts, admin.ts)
│   │   │   └── services/            # MatchingEngine.ts, PaiseLocker.ts, WebhookQueue.ts, HealthCheck.ts
│   │   └── package.json
│   │
│   └── dashboard/                   # Next.js 14 Web Admin Control Panel
│       ├── app/                     # Next.js App Router (layout.tsx, admin/page.tsx)
│       └── package.json
│
├── packages/
│   └── openupi-sdk/                 # Official npm package (openupi-sdk)
│       ├── src/
│       │   ├── core/                # Shared TypeScript types (types.ts) and HMAC verifier (verify.ts)
│       │   ├── node/                # OpenUPI Client (client.ts) & handlers (Express/Next/Fastify)
│       │   └── react/               # OpenUPIProvider, UPICheckoutModal, UPIQRCode, useUPIStatus
│       ├── tests/                   # Vitest unit tests (client.test.ts, verify.test.ts)
│       ├── tsup.config.ts           # Dual ESM/CJS build pipeline
│       └── package.json             # Subpath exports (. / ./node / ./react)
│
├── plugins/
│   └── openupi-woocommerce/         # WordPress / WooCommerce payment gateway plugin
│       └── openupi-woocommerce.php  # Native PHP WooCommerce payment integration
│
├── examples/
│   └── merchant-store/              # Full reference e-commerce app (Express backend + React frontend)
│
├── docker/
│   ├── Dockerfile.backend           # Multi-stage optimized Node.js runtime
│   └── docker-compose.yml           # Unified orchestration (Fastify + MongoDB + Redis + Cloudflare Tunnel)
│
├── exports/                         # Release APK artifacts (openupi.apk / openupi-daemon-v1.0.0.apk)
├── scripts/                         # Installation scripts & E2E integration test suites
├── tests/                           # Multi-bank SMS & Notification parsing test fixtures
├── context.md                       # Comprehensive project architecture & context documentation
└── README.md                        # Project root documentation & quickstart
```

---

## 4. End-to-End Technical Architecture & Data Lifecycle

```
[Customer on Web/Mobile]
         │
         │ 1. POST /api/v1/orders/create (Order: ₹499)
         ▼
[OpenUPI Fastify Backend]
         │
         │ 2. Allocate Paise Offset via Redis (e.g. ₹499.04)
         │    Generate NPCI Intent URI & QR SVG
         ▼
[Customer Scans Dynamic QR]
         │
         │ 3. Customer pays ₹499.04 via Google Pay / PhonePe / Paytm / BHIM
         ▼
[Indian Banking Rail / NPCI / Merchant Bank]
         │
         │ 4. Incoming Credit Notification / Bank SMS arrives on Merchant Phone
         ▼
[OpenUPI Android Daemon App]
         │
         ├──► Intercepted via NotificationListenerService or SMS BroadcastReceiver
         ├──► Regex extracts: Amount (₹499.04), UTR (422812345678), Bank/Sender
         ├──► TTS Soundbox: "Received ₹499.04 on UPI" (Instant Audio Playback)
         └──► Sign payload with HMAC-SHA256 (Shared Secret + Timestamp)
         │
         │ 5. POST /api/v1/internal/ingest (Encrypted Dispatch)
         ▼
[Matching Engine (Fastify)]
         │
         ├──► 1. Check UTR Idempotency (Prevent double processing)
         ├──► 2. Match exact amount ₹499.04 with active PENDING order
         ├──► 3. Release Redis paise lock for 499.04
         ├──► 4. Mark Order as PAID (Set UTR, paidAt timestamp)
         ├──► 5. Push real-time event to SSE Stream (/api/v1/orders/:id/stream)
         └──► 6. Enqueue Webhook job into BullMQ (with exponential retry)
         │
         ├───► [Customer Browser instantly resolves to Success screen via SSE]
         │
         └───► [Merchant Server receives HMAC-signed Webhook & fulfills order]
```

---

## 5. Core Algorithmic & Architectural Subsystems

### 5.1 Deterministic Paise Slot Allocation (`PaiseLocker.ts`)
Because standard UPI QR codes do not return an automated callback from the payer's banking app, OpenUPI identifies payments through **paise offsets**:
- For any base price (e.g. `₹500.00`), OpenUPI allocates a unique offset from `.01` to `.99` (e.g. `₹500.01`, `₹500.02`, ..., `₹500.99`).
- Allocation is managed atomically via Redis:
  ```typescript
  const key = `lock:amt:${candidate}`;
  const locked = await redis.set(key, '1', 'EX', 900, 'NX'); // 15-minute TTL
  ```
- **Capacity:** Supports up to 99 concurrent unpaid orders per base amount per VPA.
- **Lock Release:** Released immediately when matched, or auto-expired by Redis TTL after 15 minutes.

### 5.2 Dual-Redundancy Interception Engine (`android-daemon`)
The Android app operates two redundant interceptors running continuously in the background:
1. **Notification Interception (`PaymentNotificationListener.kt`):**
   - Extends Android's `NotificationListenerService`.
   - Captures status-bar notifications from all major UPI and merchant apps: Google Pay, PhonePe, Paytm, BHIM, CRED, Amazon Pay, BharatPe, Freecharge, Airtel Payments Bank, etc.
2. **SMS Interception (`GenericSmsBankParser.kt`):**
   - Subscribes to `Telephony.SMS_RECEIVED` broadcast.
   - Built-in multi-bank regex extraction engine supporting 20+ Indian financial institutions (HDFC, SBI, ICICI, Axis, Kotak, PNB, Bank of Baroda, Canara, IndusInd, Union Bank, IDFC First, etc.).

### 5.3 Offline Room Queue & Retry Worker (`PaymentSyncWorker.kt`)
- If the merchant phone experiences transient internet loss, incoming payments are stored in a local SQLite database via Android Room (`QueueEntity`).
- As soon as network connectivity is restored, `PaymentSyncWorker` dispatches queued transactions chronologically to prevent lost credits.

### 5.4 4-Stage Matching Engine (`MatchingEngine.ts`)
When a payment is ingested:
1. **Idempotency Gate:** If the 12-digit bank UTR has already been processed, return `IDEMPOTENT`.
2. **Active Order Match:** Query MongoDB for an active `PENDING` order where `exactAmount === payload.amount` and `expiresAt >= now`. If found: transition to `PAID`, release paise lock, trigger SSE, enqueue webhook, send Telegram alert.
3. **Late Match (Grace Window):** If the order expired within the last 30 minutes, mark as `PAID_LATE` and notify merchant to fulfill.
4. **Unmatched Credit Quarantine:** If no matching order exists (e.g. customer sent custom amount directly to VPA), store in `UnmatchedCredit` collection for manual 1-click reconciliation via Admin Dashboard.

### 5.5 Reliable Webhook Delivery Engine (`WebhookQueue.ts`)
- Powered by **Redis + BullMQ**.
- Outgoing webhook payloads are signed with the merchant's API Key (`HMAC-SHA256`).
- Automatic exponential backoff retry policy across 5 attempts:
  `5s → 10s → 20s → 40s → 80s`.

---

## 6. Security, Cryptography & Authentication Matrix

| Communication Path | Protocol | Authentication / Verification Mechanism |
|---|---|---|
| **Android Daemon ➔ Gateway** | HTTPS POST | `HMAC-SHA256(body + "." + timestamp, DEVICE_SHARED_SECRET)` with 5-minute replay window & `crypto.timingSafeEqual` |
| **Gateway ➔ Merchant Server** | HTTPS POST | `HMAC-SHA256(body + "." + timestamp, MERCHANT_API_KEY)` with 5-minute replay tolerance window |
| **Merchant Backend ➔ Gateway** | HTTPS REST | Static API Key passed in `x-api-key` header |
| **Frontend Browser ➔ Gateway** | SSE (HTTP) | Order-scoped read-only event stream (`/api/v1/orders/:orderId/stream`) |
| **Merchant Admin ➔ Dashboard** | HTTPS Web | API Key header authentication (`x-api-key`) |

---

## 7. Complete API Reference

### Order Management
- `POST /api/v1/orders/create` — Create order with exact paise allocation (`x-api-key` required).
- `GET /api/v1/orders/:orderId/status` — Query order payment status (`x-api-key` required).
- `GET /api/v1/orders/:orderId/stream` — Real-time Server-Sent Events (SSE) payment stream.
- `POST /api/v1/orders/:orderId/claim-utr` — Customer fallback: claim order using 12-digit bank UTR.

### Ingestion & Daemon Telemetry
- `POST /api/v1/internal/ingest` — Android daemon payment dispatch endpoint (HMAC-SHA256 authenticated).
- `POST /api/v1/internal/heartbeat` — Android daemon battery, connectivity, and liveness ping (HMAC-SHA256 authenticated).
- `GET /api/v1/internal/status` — Gateway circuit-breaker and daemon health check.

### Admin & Reconciliation
- `GET /api/v1/admin/stats` — High-level settlement volume and transaction counters.
- `GET /api/v1/admin/transactions` — Paginated transaction ledger with status filters.
- `GET /api/v1/admin/unmatched` — List unmatched bank credits awaiting reconciliation.
- `POST /api/v1/admin/reconcile` — Link an unmatched bank credit to an order.
- `GET /api/v1/admin/export/csv` — Download full transaction ledger as CSV.

---

## 8. Development, Build & Deployment Workflows

### 8.1 Backend Docker Deployment
```bash
# Clone and enter repo
git clone https://github.com/senapati484/openupi.git
cd openupi

# Configure environment
cp .env.example .env

# Run entire stack in detached mode
docker compose -f docker/docker-compose.yml up -d
```

### 8.2 Building the Android Daemon APK
```bash
cd apps/android-daemon
./gradlew assembleRelease
# Output APK generated at:
# apps/android-daemon/app/build/outputs/apk/release/openupi-release.apk
# Standarized export at:
# exports/openupi.apk
```

### 8.3 Building and Testing the SDK
```bash
cd packages/openupi-sdk
npm install
npm run build      # Generates ESM/CJS bundles + DTS files in dist/
npm run test       # Executes Vitest suite (16 tests covering HMAC and Client)
npm run typecheck  # TypeScript strict type validation
```

---

## 9. Key Best Practices & Production Guidelines

1. **Dedicated Android Hardware:** Use a dedicated low-cost Android device (Android 10+) permanently plugged into power and connected to reliable 2.4GHz/5GHz Wi-Fi.
2. **Current Bank Account (P2M):** Use a merchant Current Account VPA to avoid personal savings account (P2P) daily transaction limits (typically 20-50 transactions/day).
3. **Google Play Protect Sideloading:** Sideloaded payment listener apps with SMS/Notification permissions may be flagged by Play Protect. Turn off "Scan apps with Play Protect" in Play Store settings during installation or install via ADB:
   ```bash
   adb install -r exports/openupi.apk
   ```
4. **Android 13+ Notification Listener Access:** For Android 13+, navigate to **Phone Settings ➔ Apps ➔ OpenUPI ➔ Top right (⋮) ➔ Allow restricted settings** before granting Notification Access.
5. **Reverse UPI Refunds:** Since UPI push transactions do not have a programmatic reverse-debit API, customer refunds are issued by initiating a payment back to the customer's VPA.
