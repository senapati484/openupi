# OpenUPI — Complete Implementation Plan
> Self-Hosted Zero-Fee UPI Payment Gateway · Developer-First · Android Notification Telemetry

---

## Overview

OpenUPI turns any Indian bank account into a zero-MDR automated payment gateway using:
- **Android Notification Telemetry** — A Kotlin daemon that intercepts bank SMS/push alerts
- **Dynamic Paise Offset Protocol** — Deterministic order matching without UPI reference metadata
- **Fastify + MongoDB + Redis** — The backend matching & locking engine
- **BullMQ Webhook Queue** — Guaranteed delivery with exponential backoff
- **Drop-in SDKs** — `@openupi/node` + `@openupi/react` for instant integration

---

## Monorepo Structure

```
open-upi/
├── apps/
│   ├── android-daemon/          # Kotlin + Jetpack Compose (Notification Listener)
│   ├── backend-server/          # Fastify + TypeScript (Core Gateway API)
│   └── dashboard/               # Next.js Admin Control Panel
├── packages/
│   ├── sdk-node/                # @openupi/node — Backend SDK
│   └── sdk-react/               # @openupi/react — Drop-in QR Checkout UI
├── plugins/
│   └── openupi-woocommerce/     # WooCommerce PHP Gateway Plugin
├── docker/
│   ├── Dockerfile.backend
│   └── docker-compose.yml
├── scripts/
│   ├── init-openupi.sh          # Monorepo bootstrapper
│   ├── install.sh               # 1-Click VPS installer
│   └── test-e2e.ts              # E2E simulation test harness
├── tests/
│   └── bankParsers.test.ts      # Multi-bank SMS regex test suite
├── .github/
│   └── workflows/
│       └── release.yml          # CI/CD: APK + Docker + NPM publish
├── .env.example
├── package.json                 # Workspace root
├── tsconfig.json
└── README.md
```

---

## Phase 1 — Monorepo Foundation and Backend Server

### Step 1.1 — Bootstrap Monorepo

Files to create:

**`package.json` (root)**
- workspaces: `["apps/*", "packages/*"]`
- scripts: `dev:backend`, `dev:dashboard`, `build:packages`, `docker:up`, `docker:down`, `test`
- devDependencies: typescript, concurrently, vitest

**`tsconfig.json` (root)**
- target: ES2022, module: NodeNext, strict: true

**`.env.example`**
- PORT, MONGO_URI, REDIS_URI, MERCHANT_VPA, MERCHANT_NAME
- DEVICE_SHARED_SECRET (openssl rand -hex 32)
- MERCHANT_API_KEY (sk_live_...)
- TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID (optional ops alerts)
- CLOUDFLARE_TUNNEL_TOKEN (optional zero-trust tunnel)

---

### Step 1.2 — Backend Server (`apps/backend-server`)

```
apps/backend-server/
├── src/
│   ├── index.ts
│   ├── routes/
│   │   ├── orders.ts       # POST /orders/create, GET /orders/:id/status, GET /orders/:id/stream
│   │   ├── ingest.ts       # POST /internal/ingest (Android daemon)
│   │   ├── heartbeat.ts    # POST /internal/heartbeat, GET /health
│   │   └── admin.ts        # GET /admin/transactions, /admin/unmatched, /admin/export/csv, POST /admin/reconcile
│   ├── models/
│   │   ├── Order.ts        # IOrder: PENDING | PAID | EXPIRED | PAID_LATE
│   │   └── UnmatchedCredit.ts
│   ├── services/
│   │   ├── PaiseLocker.ts      # Redis NX EX slot allocation
│   │   ├── MatchingEngine.ts   # Atomic order matching + idempotency
│   │   ├── WebhookQueue.ts     # BullMQ producer + consumer + DLQ
│   │   ├── HealthCheck.ts      # Circuit breaker (daemon ping monitor)
│   │   └── TelegramBot.ts      # Ops alert notifications
│   └── middleware/
│       └── security.ts         # HMAC-SHA256 + timestamp drift guard
├── package.json
└── tsconfig.json
```

**Key implementation details:**

| File | Purpose |
|------|---------|
| `models/Order.ts` | TTL index on `expiresAt`, unique index on `exactAmount+status`, sparse unique on `utr` |
| `services/PaiseLocker.ts` | `redis.set(key, '1', 'EX', 900, 'NX')` for offsets .01 through .99 |
| `services/MatchingEngine.ts` | Atomic `findOneAndUpdate`, handles `PAID_LATE`, `IDEMPOTENT_IGNORE` |
| `services/WebhookQueue.ts` | BullMQ 5 attempts, backoff: 5s→10s→20s→40s→80s, signed outgoing payload |
| `services/HealthCheck.ts` | Redis key `daemon:last_seen` stale at >3 min; circuit blocks new orders |
| `middleware/security.ts` | `crypto.timingSafeEqual()` + 300s drift window |

---

### Step 1.3 — Docker Infrastructure (`docker/`)

- `docker/Dockerfile.backend` — Multi-stage Node 20 build
- `docker/docker-compose.yml` — backend + MongoDB 6.0 + Redis 7 + optional Cloudflare tunnel

Services in compose:
- `openupi-backend` — built from Dockerfile, port 4000
- `mongo` — image mongo:6.0, volume mongo_data
- `redis` — image redis:7-alpine, volume redis_data
- `cloudflared` — optional, uses CLOUDFLARE_TUNNEL_TOKEN env var

---

## Phase 2 — Android Daemon (`apps/android-daemon`)

### Gradle Dependencies

```
okhttp3:okhttp:4.12.0
androidx.work:work-runtime-ktx:2.9.0
androidx.datastore:datastore-preferences:1.0.0
androidx.room:room-runtime:2.6.1 + room-ktx + room-compiler (kapt)
kotlinx-coroutines-android:1.7.3
```

### Source Files to Create

| File | Responsibility |
|------|----------------|
| `AndroidManifest.xml` | Notification listener, battery optimization, RECEIVE_BOOT_COMPLETED |
| `parser/BankParser.kt` | `BankParser` interface + `ParsedPayment` data class |
| `parser/GenericSmsBankParser.kt` | Regex for UCO, SBI, HDFC, ICICI, PNB, Axis Bank |
| `parser/UpiAppNotificationParser.kt` | GPay, PhonePe, Paytm package allowlist parser |
| `parser/ParserRegistry.kt` | Central registry of all parsers (ordered list) |
| `service/PaymentNotificationListener.kt` | NotificationListenerService — intercepts + dispatches |
| `service/KeepAliveService.kt` | Foreground service with persistent notification (prevents OS kill) |
| `service/HeartbeatWorker.kt` | WorkManager periodic (60s) — battery + charging status ping |
| `service/PaymentSyncWorker.kt` | WorkManager offline retry with exponential backoff |
| `data/AppDatabase.kt` | Room database for QueuedPayment offline storage |
| `data/PaymentDao.kt` | DAO: insert, delete, incrementAttempts, getAllPending |
| `network/NetworkClient.kt` | HMAC-SHA256 authenticated OkHttp dispatcher (loads from DataStore) |
| `ui/MainActivity.kt` | ComponentActivity + setContent |
| `ui/DaemonScreen.kt` | Permissions card + config form + live log terminal |
| `ui/PaymentAnnouncer.kt` | TextToSpeech soundbox announcer |
| `receiver/BootReceiver.kt` | BroadcastReceiver to restart daemon on device reboot |

### UI Screen Layout (Single Screen)

1. **Top App Bar** — "OpenUPI Telemetry Daemon"
2. **Health Status Card** — Notification Listener (Active/Grant) + Battery Optimization (Exempt/Allow)
3. **Backend URL TextField** — loaded from DataStore on launch
4. **HMAC Secret TextField** — loaded from DataStore on launch
5. **Save Configuration Button** — persists to DataStore, logs confirmation
6. **Telemetry Log Terminal** — dark background LazyColumn, monospace font, live event feed

### OEM Reliability Checklist

| OEM | Required Settings |
|-----|------------------|
| Xiaomi MIUI/HyperOS | Enable Autostart + Battery Saver → No restrictions |
| Samsung OneUI | Battery → Never sleeping apps |
| OnePlus/Realme/Oppo | Battery optimization → Don't optimize + Allow background activity |
| Vivo Funtouch OS | Background power → High power usage |

---

## Phase 3 — Client SDKs

### 3.1 — `@openupi/node` (`packages/sdk-node`)

```
packages/sdk-node/
├── src/
│   ├── index.ts           # Exports: OpenUPI, verifyWebhookSignature, all types
│   ├── core/
│   │   ├── types.ts       # OpenUPIConfig, CreateOrderParams, OrderResponse, PaymentWebhookPayload
│   │   └── verify.ts      # verifyWebhookSignature() — timing-safe, replay-protected
│   └── node/
│       └── client.ts      # OpenUPI class: orders.create(), orders.status()
├── tsup.config.ts         # Dual ESM+CJS build, dts, minify
└── package.json
```

### 3.2 — `@openupi/react` (`packages/sdk-react`)

```
packages/sdk-react/
├── src/
│   ├── index.ts                    # Exports: UPICheckout, useUPIStatus
│   ├── hooks/
│   │   └── useUPIStatus.ts         # SSE hook + countdown + reconnection logic
│   └── components/
│       ├── UPICheckout.tsx         # QR + timer + deep link + success/expire states
│       └── UPICheckoutButton.tsx   # Mobile deep-link "Open in UPI App" button
├── tsup.config.ts
└── package.json
```

**UPICheckout component props:**

| Prop | Type | Description |
|------|------|-------------|
| `orderId` | string | Order ID for SSE stream subscription |
| `exactAmount` | number | Paise-offset amount to display prominently |
| `qrSvg` | string | Raw SVG string from backend (dangerouslySetInnerHTML) |
| `upiIntent` | string | `upi://pay?...` deep link URI |
| `gatewayUrl` | string | Backend base URL for SSE stream |
| `onSuccess` | `(data) => void` | Fired when SSE emits PAID status |
| `onExpire` | `() => void` | Fired when 900s countdown reaches zero |

---

## Phase 4 — Web Admin Dashboard (`apps/dashboard`)

### Next.js App Router Structure

```
apps/dashboard/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Main dashboard page
│   └── api/admin/
│       ├── transactions/route.ts
│       ├── unmatched/route.ts
│       ├── reconcile/route.ts
│       └── export/route.ts
├── components/
│   ├── MetricCard.tsx                    # Settled volume / pending / confirmed
│   ├── TransactionTable.tsx              # Ledger with status badges
│   ├── UnmatchedAlertBanner.tsx          # Amber alert panel + manual link buttons
│   └── DaemonHealthBar.tsx               # Green/Red heartbeat strip at page top
├── lib/
│   └── hooks.ts                          # useDashboardData() polling hook
└── package.json
```

### Dashboard UI Sections (Top to Bottom)

1. **Daemon Health Bar** — Full-width strip: `● HEALTHY` (green) or `⚠ DEGRADED` (red/amber) + last ping timestamp
2. **Header Row** — "OpenUPI Control Plane" title + Refresh button
3. **Metric Cards (3-col grid)** — Settled Volume (₹) | Awaiting SMS | Successful Confirmations
4. **Unmatched Alert Panel** — Amber, shows only when data present; each row: Amount + UTR + sender + "Manual Link" button
5. **Live Transaction Ledger** — Table: Order ID | Base | Target (paise offset) | UTR | Status badge | Time
6. **CSV Export** — Button calls `/api/admin/export/csv` for Tally/Zoho accounting

---

## Phase 5 — Integrations and Extensions

### 5.1 — WooCommerce Plugin (`plugins/openupi-woocommerce/`)

```
plugins/openupi-woocommerce/
├── openupi-gateway.php     # WC_Payment_Gateway subclass
├── readme.txt
└── assets/
    └── openupi-checkout.js  # QR modal injection on thank-you page
```

Plugin features:
- Admin settings: Backend URL + Merchant API Key (password field)
- `process_payment()` → calls `/api/v1/orders/create` → redirects to payment page
- `handle_webhook()` → on PAID event → `$order->payment_complete($utr)`
- Shortcode `[openupi_qr]` for custom checkout pages

### 5.2 — Telegram Ops Bot

Three notification types:

| Event | Trigger | Content |
|-------|---------|---------|
| Payment Settled | Order marked PAID | Order ID, Amount, UTR, Time |
| Daemon Offline | Heartbeat circuit opens | Minutes offline, last battery % |
| Unmatched Credit | Ingest finds no matching order | Amount, UTR, snippet, "View in Admin" inline button |

### 5.3 — Cloudflare Tunnel

Add `cloudflared` container to docker-compose.yml:
- No port forwarding needed on home/office server
- Free SSL, DDoS protection
- Token from Cloudflare Zero Trust dashboard → `CLOUDFLARE_TUNNEL_TOKEN` in .env

---

## Phase 6 — Testing, CI/CD, and Operations

### 6.1 — Multi-Bank Parser Test Suite (`tests/bankParsers.test.ts`)

Vitest test cases:

| Bank | Input Pattern | Assertions |
|------|--------------|------------|
| UCO Bank | `Credited with Rs.300.00 ... Ref 423819283912` | amount=300.00, utr=423819283912 |
| SBI | `credited by Rs 1,499.50 ... Ref no 422910482910` | comma amount, 12-digit UTR |
| HDFC | `INR 99.14 credited ... UPI:422819201948` | INR prefix + colon UTR |
| ICICI | `credited with INR 5,000.00 ... UPI/423891829381` | slash-delimited UTR |
| PNB | `credited with Rs.49.02 ... thru UPI: 429102948192` | "thru UPI" pattern |
| Debit msg | `Debited with Rs.500.00` | amount should be null (not a credit) |

### 6.2 — E2E Test Script (`scripts/test-e2e.ts`)

Flow:
1. `POST /api/v1/orders/create` → receive `exactAmount` (e.g. ₹99.04)
2. Connect SSE stream for `orderId`
3. `POST /api/v1/internal/ingest` with `amount=99.04` + mock/real HMAC
4. Assert SSE emits `{ status: 'PAID' }`
5. Assert `GET /orders/:id/status` returns `PAID` + UTR

ADB simulation commands (physical device):
- `adb shell am broadcast` to inject UCO Bank SMS
- `adb shell cmd notification post` for SBI, PhonePe simulation

### 6.3 — GitHub Actions CI/CD (`.github/workflows/release.yml`)

Triggered on `v*.*.*` tags:

| Job | Runner | Output |
|-----|--------|--------|
| `build-android` | ubuntu-latest + JDK 17 + Gradle | Release APK → GitHub Release asset |
| `build-docker` | ubuntu-latest + QEMU + Buildx | Multi-arch image → Docker Hub |
| `publish-npm` | ubuntu-latest + Node 20 | `@openupi/node` + `@openupi/react` → npm |

---

## Phase 7 — Production Hardening

### Security Layer Summary

| Layer | Implementation |
|-------|---------------|
| HMAC-SHA256 | All daemon→backend requests signed with DEVICE_SHARED_SECRET |
| Timestamp drift guard | Reject requests > 300 seconds old (replay attack shield) |
| Timing-safe comparison | `crypto.timingSafeEqual()` prevents timing oracle |
| Atomic UTR lock | MongoDB sparse unique index on `utr` (prevents double-spend) |
| API Key auth | `x-api-key` header required on all merchant endpoints |
| Cloudflare Tunnel | Optional zero-trust HTTPS, no exposed ports |

### Operational Guardrails

| Failure | Detection | Resolution |
|---------|-----------|------------|
| Daemon offline | Heartbeat > 3 min stale | Circuit breaker blocks new QRs + Telegram alert |
| Paise slots exhausted | All 99 Redis slots taken | Return 429, reduce TTL or add VPA |
| Unmatched credit | No PENDING order at that exact amount | Store in UnmatchedCredit, Telegram alert, manual resolve UI |
| Duplicate UTR | MongoDB unique constraint violation | Return 200 (idempotent), no retry storm |
| Late payment | Order EXPIRED when payment arrives | Transition to PAID_LATE, emit `payment.late_captured` event |

### Multi-VPA Scaling Strategy

For concurrent order loads > 99:
- Add multiple `MerchantAccount` records (VPA + deviceId + deviceSecret per account)
- Load-balance: merchant1@upi → orders 1-99, merchant2@upi → orders 100-198
- Reduce TTL from 15 min → 5 min to unlock paise slots 3x faster

### Refund Protocol

1. Extract customer VPA from order record
2. Generate reverse intent: `upi://pay?pa=customer@upi&am=99.00&tn=Refund+Order+9812`
3. Merchant opens link on phone and authorizes with UPI PIN

### Accounting Export

`GET /api/v1/admin/export/csv` → Tally/Zoho-compatible:
```
Date,Transaction_ID,Bank_UTR,Base_Amount,Exact_Amount,Offset_Paise,Status
2026-08-15,ORD_101,423819283912,99.00,99.04,0.04,PAID
```

---

## Implementation Priority Checklist

### Tier 1 — Core Gateway (Build First)

- [ ] Run `scripts/init-openupi.sh` to scaffold monorepo
- [ ] `apps/backend-server` — Fastify + Order model + PaiseLocker + MatchingEngine
- [ ] `docker/docker-compose.yml` — MongoDB + Redis + backend container
- [ ] `apps/android-daemon` — Android project with PaymentNotificationListener + parsers
- [ ] End-to-end smoke test: create order → ingest payment → verify PAID status

### Tier 2 — Reliability Layer

- [ ] `services/WebhookQueue.ts` — BullMQ guaranteed delivery with DLQ
- [ ] `service/HeartbeatWorker.kt` + `services/HealthCheck.ts` — Circuit breaker
- [ ] `data/AppDatabase.kt` + `service/PaymentSyncWorker.kt` — Offline queue
- [ ] `middleware/security.ts` — Full HMAC + replay protection

### Tier 3 — Integration Layer

- [ ] `packages/sdk-node` — @openupi/node with dual ESM/CJS build
- [ ] `packages/sdk-react` — @openupi/react with useUPIStatus + UPICheckout
- [ ] `apps/dashboard` — Next.js admin control panel
- [ ] `services/TelegramBot.ts` — Ops alerting (settled, offline, unmatched)

### Tier 4 — Extended Ecosystem

- [ ] `tests/bankParsers.test.ts` — Full multi-bank regex corpus (Vitest)
- [ ] `scripts/test-e2e.ts` — E2E simulation harness
- [ ] `plugins/openupi-woocommerce` — PHP WooCommerce plugin
- [ ] `.github/workflows/release.yml` — Full CI/CD pipeline
- [ ] `scripts/install.sh` — 1-click VPS installer
- [ ] Admin CSV export endpoint for accounting

---

## Quick Start Sequence (After Build)

```bash
# 1. Bootstrap monorepo structure
chmod +x scripts/init-openupi.sh && ./scripts/init-openupi.sh

# 2. Configure environment
cp .env.example .env
# Edit MERCHANT_VPA, MERCHANT_NAME
# Generate secrets: openssl rand -hex 32

# 3. Start infrastructure
docker compose -f docker/docker-compose.yml up -d mongo redis

# 4. Start backend API
npm run dev:backend

# 5. Build and install Android APK
cd apps/android-daemon
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 6. Run E2E simulation test
npx ts-node scripts/test-e2e.ts

# 7. Start admin dashboard
npm run dev:dashboard

# 8. Production deploy on VPS
./scripts/install.sh
```

---

## Open Questions and Design Decisions

> [!IMPORTANT]
> **NPCI Account Type:** Production requires a Current Account (P2M VPA) to bypass the 20 tx/day personal cap. Confirm merchant has a business current account before building multi-VPA rotation.

> [!IMPORTANT]
> **Android Device Dependency:** The daemon requires a dedicated Android phone with the merchant's bank SIM, connected to power 24/7. The entire gateway fails if this device is offline — this must be documented prominently.

> [!WARNING]
> **99 Concurrent Order Ceiling:** A single VPA supports max 99 simultaneous PENDING orders for the same base amount. Design multi-VPA load balancing from the start for high-volume merchants.

> [!NOTE]
> **Refunds Are Manual:** This gateway cannot initiate refunds programmatically. Refund flow is a reverse UPI intent link that the merchant clicks on their phone. Communicate clearly in merchant docs.

> [!NOTE]
> **Legal:** Using a personal savings account for commercial transactions may violate bank ToS. Recommend business current account with proper merchant VPA registration for production use.
