import express, { type Request, type Response } from 'express';
import { OpenUPI, verifyWebhookSignature } from 'openupi-sdk';

const app = express();
const PORT = 5000;

// Initialize OpenUPI backend client
const upi = new OpenUPI({
  apiUrl: process.env.OPENUPI_API_URL || 'http://localhost:4000',
  apiKey: process.env.OPENUPI_API_KEY || 'sk_live_demo12345678',
});

// Use raw body for webhook verification
app.use('/webhook/openupi', express.raw({ type: 'application/json' }));
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
 * 2. Webhook Listener — OpenUPI backend confirms payment
 */
app.post('/webhook/openupi', (req: Request, res: Response) => {
  const rawBody = req.body.toString();
  const signature = req.headers['x-openupi-signature'] as string;
  const timestamp = req.headers['x-openupi-timestamp'] as string;

  const isValid = verifyWebhookSignature({
    rawBody,
    signature,
    timestamp,
    secret: process.env.OPENUPI_API_KEY || 'sk_live_demo12345678',
  });

  if (!isValid) {
    console.warn('[Store Webhook] Invalid HMAC signature or expired timestamp');
    return res.status(401).send('Unauthorized');
  }

  const payload = JSON.parse(rawBody);
  console.log(`[Store Webhook] ✅ Payment Settled for Order: ${payload.orderId} | UTR: ${payload.utr}`);

  // Fulfill merchant product/service here:
  // - Upgrade user database account
  // - Send confirmation email
  // - Unlock digital downloads

  res.status(200).json({ received: true });
});

app.listen(PORT, () => {
  console.log(`🚀 Merchant store backend running on http://localhost:${PORT}`);
});
