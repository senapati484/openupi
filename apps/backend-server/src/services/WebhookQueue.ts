import { Queue, Worker, type Job } from 'bullmq';
import { createHmac } from 'node:crypto';
import axios from 'axios';
import { Redis } from 'ioredis';

const redisConnection = new Redis(process.env.REDIS_URI || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export interface WebhookJobData {
  orderId: string;
  baseAmount: number;
  exactAmount: number;
  utr: string;
  status: 'PAID';
  callbackUrl: string;
  merchantSecret: string;
}

// ── Webhook Producer Queue ────────────────────────────────────────────────────
export const webhookQueue = new Queue<WebhookJobData>('webhooks', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5s → 10s → 20s → 40s → 80s
    },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
});

// ── Webhook Consumer Worker ───────────────────────────────────────────────────
export const webhookWorker = new Worker<WebhookJobData>(
  'webhooks',
  async (job: Job<WebhookJobData>) => {
    const { callbackUrl, merchantSecret, ...payload } = job.data;
    const bodyString = JSON.stringify(payload);
    const timestamp = Date.now().toString();

    // Sign outgoing webhook payload with merchant's API key as secret
    const signature = createHmac('sha256', merchantSecret)
      .update(`${bodyString}.${timestamp}`)
      .digest('hex');

    const response = await axios.post(callbackUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-OpenUPI-Timestamp': timestamp,
        'X-OpenUPI-Signature': signature,
        'User-Agent': 'OpenUPI-Webhook-Delivery/1.0',
      },
      timeout: 10_000, // 10s
    });

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Webhook target responded with HTTP ${response.status}`);
    }

    return { delivered: true, httpStatus: response.status };
  },
  { connection: redisConnection }
);

webhookWorker.on('failed', (job, err) => {
  console.error(
    `[Webhook DLQ] Job ${job?.id} for Order ${job?.data.orderId} exhausted retries: ${err.message}`
  );
});

webhookWorker.on('completed', (job) => {
  console.log(`[Webhook] Delivered for Order ${job.data.orderId}`);
});
