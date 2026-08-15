import type { FastifyInstance } from 'fastify';
import QRCode from 'qrcode';
import { Order } from '../models/Order.js';
import { allocateExactAmount } from '../services/PaiseLocker.js';
import { verifyMerchantApiKey } from '../middleware/security.js';
import { isGatewayHealthy } from '../services/HealthCheck.js';

export async function ordersRoutes(fastify: FastifyInstance): Promise<void> {
  // ── POST /api/v1/orders/create ─────────────────────────────────────────────
  fastify.post('/create', {
    preHandler: [verifyMerchantApiKey],
    handler: async (req, reply) => {
      const { orderId, amount, note, callbackUrl, customerVpa } = req.body as {
        orderId: string;
        amount: number;
        note?: string;
        callbackUrl?: string;
        customerVpa?: string;
      };

      if (!orderId || !amount || isNaN(amount) || amount <= 0) {
        return reply.status(400).send({ error: 'orderId and a positive amount are required' });
      }

      // Check circuit breaker — refuse new QRs if daemon is offline
      const health = await isGatewayHealthy();
      if (!health.healthy) {
        return reply.status(503).send({
          error: 'Gateway degraded',
          reason: health.reason,
          suggestion: 'Ensure the Android daemon phone is online and the OpenUPI app is running.',
        });
      }

      // Allocate paise offset slot
      const exactAmount = await allocateExactAmount(Number(amount));
      const vpa = process.env.MERCHANT_VPA!;
      const merchantName = encodeURIComponent(process.env.MERCHANT_NAME || 'Merchant');
      const txNote = encodeURIComponent(note || `Order ${orderId}`);

      // NPCI standard UPI Intent URI
      const upiIntent = `upi://pay?pa=${vpa}&pn=${merchantName}&am=${exactAmount}&cu=INR&tn=${txNote}`;
      const qrSvg = await QRCode.toString(upiIntent, { type: 'svg' });

      const order = await Order.create({
        orderId,
        baseAmount: Number(amount),
        exactAmount,
        vpa,
        callbackUrl,
        customerVpa,
        note,
        expiresAt: new Date(Date.now() + (parseInt(process.env.PAISE_SLOT_TTL_SECONDS || '900', 10) * 1000)),
      });

      return reply.status(201).send({
        orderId: order.orderId,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        vpa,
        upiIntent,
        qrSvg,
        expiresAt: order.expiresAt,
      });
    },
  });

  // ── GET /api/v1/orders/:orderId/status ────────────────────────────────────
  fastify.get('/:orderId/status', {
    preHandler: [verifyMerchantApiKey],
    handler: async (req, reply) => {
      const { orderId } = req.params as { orderId: string };
      const order = await Order.findOne({ orderId }).lean();
      if (!order) return reply.status(404).send({ error: 'Order not found' });

      return {
        orderId: order.orderId,
        baseAmount: order.baseAmount,
        exactAmount: order.exactAmount,
        status: order.status,
        utr: order.utr,
        paidAt: order.paidAt,
        expiresAt: order.expiresAt,
        createdAt: order.createdAt,
      };
    },
  });

  // ── GET /api/v1/orders/:orderId/stream (SSE) ──────────────────────────────
  fastify.get('/:orderId/stream', async (req, reply) => {
    const { orderId } = req.params as { orderId: string };

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('X-Accel-Buffering', 'no'); // disable Nginx buffering
    reply.raw.flushHeaders();

    const send = (data: object) => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const poll = setInterval(async () => {
      const order = await Order.findOne({ orderId }).lean();
      if (!order) {
        send({ status: 'NOT_FOUND' });
        clearInterval(poll);
        reply.raw.end();
        return;
      }
      if (order.status === 'PAID' || order.status === 'PAID_LATE') {
        send({ status: order.status, utr: order.utr, paidAt: order.paidAt });
        clearInterval(poll);
        reply.raw.end();
      } else if (order.status === 'EXPIRED') {
        send({ status: 'EXPIRED' });
        clearInterval(poll);
        reply.raw.end();
      } else {
        const expiresInSeconds = Math.max(
          0,
          Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000)
        );
        send({ status: 'PENDING', expiresInSeconds });
      }
    }, 2000);

    req.raw.on('close', () => clearInterval(poll));
  });
}
