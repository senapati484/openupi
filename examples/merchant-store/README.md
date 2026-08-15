# OpenUPI Merchant Store Integration Example

> **Complete Working E-Commerce Integration Demo using `openupi-sdk`.**  
> Demonstrates backend order creation, timing-safe webhook verification, and React checkout widget integration.

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
