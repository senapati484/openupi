import { Redis } from 'ioredis';
import type { FastifyInstance } from 'fastify';
import { notifyDaemonOffline } from './TelegramBot.js';

const redis = new Redis(process.env.REDIS_URI || 'redis://localhost:6379', {
  lazyConnect: true,
});

const STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes
const MONITOR_INTERVAL_MS = 60 * 1000;     // check every 60 seconds

export async function recordHeartbeat(data: {
  batteryLevel: number;
  isCharging: boolean;
  version?: string;
}): Promise<void> {
  await redis.connect().catch(() => {});
  await redis.set('daemon:last_seen', Date.now().toString());
  await redis.set('daemon:telemetry', JSON.stringify(data));
}

export async function getDaemonTelemetry(): Promise<{
  lastSeen: number | null;
  batteryLevel: number | null;
  isCharging: boolean | null;
}> {
  await redis.connect().catch(() => {});
  const lastSeen = await redis.get('daemon:last_seen');
  const telemetryRaw = await redis.get('daemon:telemetry');
  const telemetry = telemetryRaw ? JSON.parse(telemetryRaw) : {};
  return {
    lastSeen: lastSeen ? parseInt(lastSeen, 10) : null,
    batteryLevel: telemetry.batteryLevel ?? null,
    isCharging: telemetry.isCharging ?? null,
  };
}

export async function isGatewayHealthy(): Promise<{ healthy: boolean; reason?: string }> {
  await redis.connect().catch(() => {});
  const lastSeenStr = await redis.get('daemon:last_seen');

  if (!lastSeenStr) {
    return { healthy: false, reason: 'Daemon phone has never connected to this server.' };
  }

  const diffMs = Date.now() - parseInt(lastSeenStr, 10);
  if (diffMs > STALE_THRESHOLD_MS) {
    const mins = Math.round(diffMs / 1000 / 60);
    return { healthy: false, reason: `Daemon phone offline for ${mins} minute(s).` };
  }

  return { healthy: true };
}

let offlineAlertSent = false;

/**
 * Starts a background interval that checks daemon health.
 * Opens circuit (blocks new QR creation) and sends Telegram alert if stale.
 */
export function startCircuitBreakerMonitor(fastify: FastifyInstance): void {
  setInterval(async () => {
    const health = await isGatewayHealthy();
    if (!health.healthy) {
      if (!offlineAlertSent) {
        fastify.log.warn(`[Circuit Breaker] DEGRADED — ${health.reason}`);
        const telemetry = await getDaemonTelemetry();
        const mins = telemetry.lastSeen
          ? Math.round((Date.now() - telemetry.lastSeen) / 60_000)
          : 99;
        await notifyDaemonOffline(mins, telemetry.batteryLevel ?? undefined);
        offlineAlertSent = true;
      }
    } else {
      if (offlineAlertSent) {
        fastify.log.info('[Circuit Breaker] HEALTHY — daemon reconnected.');
        offlineAlertSent = false;
      }
    }
  }, MONITOR_INTERVAL_MS);
}
