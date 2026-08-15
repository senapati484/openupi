# OpenUPI Merchant Store Integration Example

> **Complete Working E-Commerce Integration Demo using `openupi-sdk`.**  
> Demonstrates backend order creation, timing-safe webhook verification, and React checkout widget integration.

<p align="center">
  <a href="https://www.npmjs.com/package/openupi-sdk"><img src="https://img.shields.io/npm/v/openupi-sdk?color=blue&label=npm%20openupi-sdk" alt="npm" /></a>
  <a href="https://sourceforge.net/projects/openupi/"><img src="https://img.shields.io/badge/Download%20APK-SourceForge-brightgreen" alt="Download APK on SourceForge" /></a>
  <a href="https://github.com/senapati484/openupi/releases"><img src="https://img.shields.io/github/v/release/senapati484/openupi?label=GitHub%20Release" alt="GitHub Release" /></a>
</p>

---

## 🚀 Running the Example Store

```bash
cd examples/merchant-store
npm install
npm run dev
```

The example server starts on `http://localhost:5000`.

---

## 💻 Code Structure

- **[`src/server.ts`](file:///Users/sayansenapati/Desktop/Dev/Innovation/OpenUPI/examples/merchant-store/src/server.ts)**:
  - `POST /api/checkout`: Creates an order using `upi.orders.create({ ... })`.
  - `POST /webhook/openupi`: Verifies incoming HMAC signatures using `verifyWebhookSignature(...)` and confirms digital fulfillment.
- **[`src/checkout.tsx`](file:///Users/sayansenapati/Desktop/Dev/Innovation/OpenUPI/examples/merchant-store/src/checkout.tsx)**:
  - Renders `<UPICheckoutModal />` and `<UPICheckoutButton />` from `openupi-sdk/react`.
