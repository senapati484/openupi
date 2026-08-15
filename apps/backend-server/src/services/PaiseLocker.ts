import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URI || 'redis://localhost:6379', {
  lazyConnect: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

const SLOT_TTL_SECONDS = parseInt(process.env.PAISE_SLOT_TTL_SECONDS || '900', 10); // 15 min default

/**
 * Allocates the next available paise offset for a given base amount.
 * Tries offsets .01 through .99 atomically using Redis SET NX EX.
 *
 * @param baseAmount  e.g. 99.00
 * @returns           e.g. 99.04 (first available slot)
 * @throws            Error if all 99 slots are occupied
 */
export async function allocateExactAmount(baseAmount: number): Promise<number> {
  await redis.connect().catch(() => {}); // no-op if already connected

  for (let offset = 1; offset <= 99; offset++) {
    const candidate = Number((baseAmount + offset / 100).toFixed(2));
    const key = `lock:amt:${candidate}`;
    const locked = await redis.set(key, '1', 'EX', SLOT_TTL_SECONDS, 'NX');
    if (locked === 'OK') return candidate;
  }

  throw new Error(
    `All 99 paise offset slots for ₹${baseAmount.toFixed(2)} are currently occupied. ` +
    `Try again in a moment, or add a second VPA to the rotation pool.`
  );
}

/**
 * Releases the Redis paise lock for a given exact amount after payment confirmation.
 */
export async function releasePaiseSlot(exactAmount: number): Promise<void> {
  await redis.del(`lock:amt:${exactAmount}`);
}

export { redis };
