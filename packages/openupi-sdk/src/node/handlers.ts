import { verifyWebhookSignature } from '../core/verify.js';
import type { PaymentWebhookPayload, WebhookHandlerOptions } from '../core/types.js';

/**
 * Creates an Express.js middleware / route handler for OpenUPI Webhooks.
 * Automatically verifies timing-safe HMAC-SHA256 signatures, checks 5-minute replay tolerance,
 * parses JSON, and invokes onPaymentSuccess / onPaymentLate.
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { createExpressWebhookHandler } from 'openupi-sdk/node';
 *
 * const app = express();
 * app.post('/api/webhooks/openupi', express.raw({ type: '*\/*' }), createExpressWebhookHandler({
 *   secret: process.env.OPENUPI_API_KEY!,
 *   onPaymentSuccess: async (event) => {
 *     console.log(`Order ${event.orderId} paid with UTR ${event.utr}!`);
 *     await fulfillOrder(event.orderId);
 *   }
 * }));
 * ```
 */
export function createExpressWebhookHandler(options: WebhookHandlerOptions) {
  return async (req: any, res: any) => {
    try {
      const rawBody = typeof req.body === 'string' ? req.body : req.body?.toString('utf8') || '';
      const signature = (req.headers['x-openupi-signature'] as string) || '';
      const timestamp = (req.headers['x-openupi-timestamp'] as string) || '';

      const isValid = verifyWebhookSignature({
        rawBody,
        signature,
        timestamp,
        secret: options.secret,
        toleranceMs: options.toleranceMs || 300000,
      });

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid HMAC signature or expired timestamp' });
      }

      const event: PaymentWebhookPayload = JSON.parse(rawBody);

      if (event.status === 'PAID') {
        await options.onPaymentSuccess(event);
      } else if (event.status === 'PAID_LATE' && options.onPaymentLate) {
        await options.onPaymentLate(event);
      } else if (event.status === 'PAID_LATE') {
        await options.onPaymentSuccess(event);
      }

      return res.status(200).json({ received: true, orderId: event.orderId });
    } catch (err: any) {
      if (options.onError) {
        options.onError(err);
      }
      return res.status(500).json({ error: err.message || 'Webhook processing failed' });
    }
  };
}

/**
 * Creates a Next.js App Router (route.ts) POST handler for OpenUPI Webhooks.
 *
 * @example
 * ```typescript
 * // app/api/webhooks/openupi/route.ts
 * import { createNextWebhookHandler } from 'openupi-sdk/node';
 *
 * export const POST = createNextWebhookHandler({
 *   secret: process.env.OPENUPI_API_KEY!,
 *   onPaymentSuccess: async (event) => {
 *     await db.orders.update({ where: { id: event.orderId }, data: { status: 'PAID' } });
 *   }
 * });
 * ```
 */
export function createNextWebhookHandler(options: WebhookHandlerOptions) {
  return async (req: Request): Promise<Response> => {
    try {
      const rawBody = await req.text();
      const signature = req.headers.get('x-openupi-signature') || '';
      const timestamp = req.headers.get('x-openupi-timestamp') || '';

      const isValid = verifyWebhookSignature({
        rawBody,
        signature,
        timestamp,
        secret: options.secret,
        toleranceMs: options.toleranceMs || 300000,
      });

      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid signature or expired timestamp' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const event: PaymentWebhookPayload = JSON.parse(rawBody);

      if (event.status === 'PAID') {
        await options.onPaymentSuccess(event);
      } else if (event.status === 'PAID_LATE' && options.onPaymentLate) {
        await options.onPaymentLate(event);
      } else if (event.status === 'PAID_LATE') {
        await options.onPaymentSuccess(event);
      }

      return new Response(JSON.stringify({ received: true, orderId: event.orderId }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      if (options.onError) {
        options.onError(err);
      }
      return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  };
}
