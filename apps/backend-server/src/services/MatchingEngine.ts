import { Order } from '../models/Order.js';
import { UnmatchedCredit } from '../models/UnmatchedCredit.js';
import { releasePaiseSlot } from './PaiseLocker.js';
import { webhookQueue } from './WebhookQueue.js';
import { notifyPaymentSettled, notifyUnmatchedCredit } from './TelegramBot.js';

export interface IngestPayload {
  amount: number;
  utr?: string;
  sender: string;
  rawText: string;
  timestamp: number;
}

export type MatchResult =
  | { status: 'MATCHED'; orderId: string }
  | { status: 'MATCHED_LATE'; orderId: string }
  | { status: 'UNMATCHED'; reason: string }
  | { status: 'IDEMPOTENT'; orderId: string };

/**
 * Core matching engine.
 * Matches an ingested bank credit to a pending order by exact paise-offset amount.
 * Handles: normal match, late match, duplicate UTR (idempotent), and unmatched credits.
 */
export async function matchAndSettle(payload: IngestPayload): Promise<MatchResult> {
  const { amount, utr, sender, rawText } = payload;
  const normalizedUtr = utr || `MANUAL-${Date.now()}`;

  // ── 1. Check idempotency: same UTR already processed ─────────────────────
  if (utr) {
    const existing = await Order.findOne({ utr });
    if (existing) {
      return { status: 'IDEMPOTENT', orderId: existing.orderId };
    }
  }

  // ── 2. Try to match against a PENDING order within validity window ────────
  const pendingOrder = await Order.findOneAndUpdate(
    { exactAmount: amount, status: 'PENDING', expiresAt: { $gte: new Date() } },
    { status: 'PAID', utr: normalizedUtr, paidAt: new Date() },
    { sort: { createdAt: -1 }, new: true }
  );

  if (pendingOrder) {
    await releasePaiseSlot(amount);

    if (pendingOrder.callbackUrl) {
      await webhookQueue.add('deliver', {
        orderId: pendingOrder.orderId,
        baseAmount: pendingOrder.baseAmount,
        exactAmount: pendingOrder.exactAmount,
        utr: normalizedUtr,
        status: 'PAID',
        callbackUrl: pendingOrder.callbackUrl,
        merchantSecret: process.env.MERCHANT_API_KEY!,
      });
    }

    await notifyPaymentSettled({
      orderId: pendingOrder.orderId,
      baseAmount: pendingOrder.baseAmount,
      exactAmount: pendingOrder.exactAmount,
      utr: normalizedUtr,
    });

    return { status: 'MATCHED', orderId: pendingOrder.orderId };
  }

  // ── 3. Check for recently EXPIRED order (late payment within 30 min) ─────
  const expiredOrder = await Order.findOneAndUpdate(
    {
      exactAmount: amount,
      status: 'EXPIRED',
      expiresAt: { $gte: new Date(Date.now() - 30 * 60 * 1000) },
    },
    { status: 'PAID_LATE', utr: normalizedUtr, paidAt: new Date() },
    { sort: { createdAt: -1 }, new: true }
  );

  if (expiredOrder) {
    if (expiredOrder.callbackUrl) {
      await webhookQueue.add('deliver', {
        orderId: expiredOrder.orderId,
        baseAmount: expiredOrder.baseAmount,
        exactAmount: expiredOrder.exactAmount,
        utr: normalizedUtr,
        status: 'PAID',
        callbackUrl: expiredOrder.callbackUrl,
        merchantSecret: process.env.MERCHANT_API_KEY!,
      });
    }
    return { status: 'MATCHED_LATE', orderId: expiredOrder.orderId };
  }

  // ── 4. No match — store as unmatched credit & alert ──────────────────────
  try {
    await UnmatchedCredit.create({ amount, utr, sender, rawText });
    await notifyUnmatchedCredit({ amount, utr: normalizedUtr, rawText });
  } catch {
    // Duplicate utr in UnmatchedCredit — already recorded
  }

  return {
    status: 'UNMATCHED',
    reason: `No active PENDING or recently EXPIRED order found for ₹${amount.toFixed(2)}`,
  };
}
