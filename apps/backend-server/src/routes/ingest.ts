import type { FastifyInstance } from 'fastify';
import { verifyDeviceSignature } from '../middleware/security.js';
import { matchAndSettle } from '../services/MatchingEngine.js';

export async function ingestRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/internal/ingest
   * Called exclusively by the Android daemon after intercepting a bank notification.
   * Requires HMAC-SHA256 authentication headers.
   */
  fastify.post('/ingest', {
    preHandler: [verifyDeviceSignature],
    handler: async (req, reply) => {
      const { amount, utr, sender, rawText, timestamp } = req.body as {
        amount: number;
        utr?: string;
        sender: string;
        rawText: string;
        timestamp: number;
      };

      if (!amount || isNaN(amount)) {
        return reply.status(400).send({ error: 'amount is required and must be a number' });
      }

      const result = await matchAndSettle({ amount, utr, sender, rawText, timestamp });

      fastify.log.info(`[Ingest] ${result.status} — ₹${amount.toFixed(2)}${utr ? ` UTR:${utr}` : ''}`);

      // Always return 200 to daemon to prevent retry storms on non-critical states
      return reply.status(200).send(result);
    },
  });
}
