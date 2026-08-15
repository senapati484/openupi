import express, { type Request, type Response } from 'express';
import { OpenUPI, createExpressWebhookHandler } from 'openupi-sdk';

const app = express();
const PORT = 5000;

// Initialize OpenUPI backend client
const upi = new OpenUPI({
  apiUrl: process.env.OPENUPI_API_URL || 'http://localhost:4000',
  apiKey: process.env.OPENUPI_API_KEY || 'sk_live_demo12345678',
});

// Middleware
app.use(express.json());

/**
 * 1. Checkout Endpoint — Merchant frontend requests order creation
 */
app.post('/api/checkout', async (req: Request, res: Response) => {
  try {
    const { amount, customerName, planName } = req.body;

    const orderId = `ORD-${Date.now()}`;
    const order = await upi.orders.create({
      orderId,
      amount: Number(amount) || 499,
      note: `${planName || 'Digital Subscription'} for ${customerName || 'Customer'}`,
      callbackUrl: 'http://localhost:5000/webhook/openupi',
    });

    console.log(`[Store] Created order ${order.orderId} for ₹${order.exactAmount}`);
    res.json({ success: true, order });
  } catch (err: any) {
    console.error('[Store] Order creation failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 2. Webhook Listener — Zero-boilerplate HMAC verification & fulfillment
 */
app.post(
  '/webhook/openupi',
  express.raw({ type: '*/*' }),
  createExpressWebhookHandler({
    secret: process.env.OPENUPI_API_KEY || 'sk_live_demo12345678',
    onPaymentSuccess: async (event) => {
      console.log(`[Store Webhook] ✅ Payment Settled for Order: ${event.orderId} | ₹${event.exactAmount} | UTR: ${event.utr}`);
      // Fulfill merchant product/service here (e.g. update user DB, send email, unlock download)
    },
    onPaymentLate: async (event) => {
      console.log(`[Store Webhook] ⚠️ Late payment recovered for Order: ${event.orderId} | UTR: ${event.utr}`);
      // Gracefully credit user account
    },
    onError: (err) => {
      console.error('[Store Webhook Error]', err.message);
    }
  })
);

app.listen(PORT, () => {
  console.log(`🚀 Merchant store backend running on http://localhost:${PORT}`);
});
