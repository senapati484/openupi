import type { FastifyInstance } from 'fastify';
import { Order } from '../models/Order.js';
import { UnmatchedCredit } from '../models/UnmatchedCredit.js';
import { verifyMerchantApiKey } from '../middleware/security.js';

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // ── GET /api/v1/admin/transactions ────────────────────────────────────────
  fastify.get('/transactions', {
    preHandler: [verifyMerchantApiKey],
    handler: async (req, reply) => {
      const { limit = '50', page = '1', status } = req.query as {
        limit?: string;
        page?: string;
        status?: string;
      };
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;

      const [transactions, total] = await Promise.all([
        Order.find(filter)
          .sort({ createdAt: -1 })
          .skip((parseInt(page) - 1) * parseInt(limit))
          .limit(parseInt(limit))
          .lean(),
        Order.countDocuments(filter),
      ]);

      return { transactions, total, page: parseInt(page), limit: parseInt(limit) };
    },
  });

  // ── GET /api/v1/admin/unmatched ───────────────────────────────────────────
  fastify.get('/unmatched', {
    preHandler: [verifyMerchantApiKey],
    handler: async (_req, _reply) => {
      const unmatched = await UnmatchedCredit.find({ resolved: false })
        .sort({ receivedAt: -1 })
        .lean();
      return { unmatched };
    },
  });

  // ── POST /api/v1/admin/reconcile ──────────────────────────────────────────
  fastify.post('/reconcile', {
    preHandler: [verifyMerchantApiKey],
    handler: async (req, reply) => {
      const { unmatchedCreditId, orderId } = req.body as {
        unmatchedCreditId: string;
        orderId: string;
      };

      const [credit, order] = await Promise.all([
        UnmatchedCredit.findById(unmatchedCreditId),
        Order.findOne({ orderId }),
      ]);

      if (!credit) return reply.status(404).send({ error: 'Unmatched credit not found' });
      if (!order) return reply.status(404).send({ error: 'Order not found' });
      if (order.status === 'PAID') return reply.status(409).send({ error: 'Order already marked PAID' });

      order.status = 'PAID';
      order.utr = credit.utr || `MANUAL-RECONCILE-${Date.now()}`;
      order.paidAt = new Date();
      credit.resolved = true;
      credit.resolvedOrderId = orderId;

      await Promise.all([order.save(), credit.save()]);

      return { success: true, orderId, utr: order.utr };
    },
  });

  // ── GET /api/v1/admin/export/csv ──────────────────────────────────────────
  fastify.get('/export/csv', {
    preHandler: [verifyMerchantApiKey],
    handler: async (_req, reply) => {
      const orders = await Order.find({ status: { $in: ['PAID', 'PAID_LATE'] } })
        .sort({ paidAt: -1 })
        .lean();

      const rows = [
        'Date,Transaction_ID,Bank_UTR,Base_Amount,Exact_Amount,Offset_Paise,Status',
        ...orders.map((o) => {
          const date = (o.paidAt || o.createdAt).toISOString().split('T')[0];
          const offset = Number((o.exactAmount - o.baseAmount).toFixed(2));
          return `${date},${o.orderId},${o.utr || ''},${o.baseAmount},${o.exactAmount},${offset},${o.status}`;
        }),
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="openupi-ledger.csv"');
      return reply.send(rows);
    },
  });

  // ── GET /api/v1/admin/stats ────────────────────────────────────────────────
  fastify.get('/stats', {
    preHandler: [verifyMerchantApiKey],
    handler: async () => {
      const [paidOrders, pendingCount, unmatchedCount] = await Promise.all([
        Order.find({ status: { $in: ['PAID', 'PAID_LATE'] } }).lean(),
        Order.countDocuments({ status: 'PENDING' }),
        UnmatchedCredit.countDocuments({ resolved: false }),
      ]);

      const settledVolume = paidOrders.reduce((acc, o) => acc + o.baseAmount, 0);
      return {
        settledVolume: Number(settledVolume.toFixed(2)),
        settledCount: paidOrders.length,
        pendingCount,
        unmatchedCount,
      };
    },
  });
}
