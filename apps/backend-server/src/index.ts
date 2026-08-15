import 'dotenv/config';
import Fastify from 'fastify';
import mongoose from 'mongoose';
import { ordersRoutes } from './routes/orders.js';
import { ingestRoutes } from './routes/ingest.js';
import { heartbeatRoutes } from './routes/heartbeat.js';
import { adminRoutes } from './routes/admin.js';
import { webhookWorker } from './services/WebhookQueue.js';
import { startCircuitBreakerMonitor } from './services/HealthCheck.js';

export const fastify = Fastify({ logger: { level: 'info' } });

// ── Database Connections ──────────────────────────────────────────────────────
await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/openupi');
fastify.log.info('MongoDB connected');

// ── CORS (allow all origins for self-hosted use) ──────────────────────────────
fastify.addHook('onRequest', async (req, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Headers', 'Content-Type, x-api-key');
  if (req.method === 'OPTIONS') {
    reply.status(204).send();
  }
});

// ── Route Registration ────────────────────────────────────────────────────────
await fastify.register(ordersRoutes, { prefix: '/api/v1/orders' });
await fastify.register(ingestRoutes, { prefix: '/api/v1/internal' });
await fastify.register(heartbeatRoutes, { prefix: '/api/v1/internal' });
await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });

// ── Background Workers ────────────────────────────────────────────────────────
// BullMQ webhook consumer starts automatically on import
fastify.log.info('BullMQ webhook worker started');

// Circuit breaker monitor (checks daemon heartbeat every 60s)
startCircuitBreakerMonitor(fastify);

// ── Health Check ──────────────────────────────────────────────────────────────
fastify.get('/health', async () => {
  const { isGatewayHealthy } = await import('./services/HealthCheck.js');
  const health = await isGatewayHealthy();
  return {
    status: health.healthy ? 'HEALTHY' : 'DEGRADED',
    daemonConnected: health.healthy,
    reason: health.reason,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  };
});

// ── Start Server ──────────────────────────────────────────────────────────────
try {
  await fastify.listen({ port: Number(process.env.PORT) || 4000, host: '0.0.0.0' });
  fastify.log.info('OpenUPI Gateway running on port 4000');
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
