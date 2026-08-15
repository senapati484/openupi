# OpenUPI Backend Server

> **High-Performance Fastify + MongoDB + Redis Payment Gateway Engine.**  
> Manages deterministic paise slot allocation, matches bank credits in sub-milliseconds, pushes real-time SSE updates to customer browsers, and delivers signed webhooks via BullMQ.

<p align="center">
  <a href="https://www.npmjs.com/package/openupi-sdk"><img src="https://img.shields.io/npm/v/openupi-sdk?color=blue&label=npm%20openupi-sdk" alt="npm" /></a>
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
</p>

---

## ⚡ Architecture & Core Services

- **`PaiseLocker.ts`**: Allocates 2-decimal paise offsets (`.01` to `.99`) per base order amount using atomic Redis `SET NX EX` locks. Automatically recycles expired slots.
- **`MatchingEngine.ts`**: Matches incoming bank payments to active orders in sub-milliseconds, handles duplicate UTR deduplication, and routes unidentified credits to an unmatched queue.
- **`WebhookQueue.ts`**: BullMQ queue with 5 exponential backoff retries for delivering HMAC-signed webhooks to merchant endpoints.
- **`HealthCheck.ts`**: Gateway circuit breaker — checks Android phone heartbeat timestamps and temporarily pauses QR generation if the listener phone goes offline.
- **`security.ts`**: Timing-safe HMAC-SHA256 request verification with strict 5-minute replay attack protection.
- **`TelegramBot.ts`**: Instant Telegram alerts for payment confirmations and daemon offline warnings.

---

## 🚀 Running Locally & in Production

### Option 1: Docker Compose (Recommended)

```bash
# From repository root:
docker compose -f docker/docker-compose.yml up -d
```

### Option 2: Node.js / TypeScript Direct

```bash
cd apps/backend-server
npm install
npm run dev
```

### Environment Variables (`.env`)

```env
PORT=4000
MONGO_URI=mongodb://localhost:27017/openupi
REDIS_URI=redis://localhost:6379

MERCHANT_VPA=yourbusiness@okaxis
MERCHANT_NAME="Acme Corp"
MERCHANT_API_KEY=sk_live_1234567890abcdef
DEVICE_SHARED_SECRET=your_32_character_secret_key

# Optional Telegram Notifications
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```
