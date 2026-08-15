import type { FastifyInstance } from 'fastify';
import { verifyDeviceSignature } from '../middleware/security.js';
import { recordHeartbeat, isGatewayHealthy, getDaemonTelemetry } from '../services/HealthCheck.js';

export async function heartbeatRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/v1/internal/heartbeat
   * Called by Android HeartbeatWorker every 60 seconds.
   * Records daemon liveness and battery/network telemetry.
   */
  fastify.post('/heartbeat', {
    preHandler: [verifyDeviceSignature],
    handler: async (req, reply) => {
      const { batteryLevel, isCharging, version } = req.body as {
        batteryLevel: number;
        isCharging: boolean;
        version?: string;
      };

      await recordHeartbeat({ batteryLevel, isCharging, version });

      fastify.log.debug(`[Heartbeat] Battery: ${batteryLevel}% | Charging: ${isCharging}`);

      return reply.status(200).send({ acknowledged: true, serverTime: Date.now() });
    },
  });

  /**
   * GET /health (also registered in index.ts at root level)
   * Public health check for monitoring tools.
   */
  fastify.get('/status', async (_req, reply) => {
    const health = await isGatewayHealthy();
    const telemetry = await getDaemonTelemetry();
    return reply.status(health.healthy ? 200 : 503).send({
      status: health.healthy ? 'HEALTHY' : 'DEGRADED',
      daemonConnected: health.healthy,
      reason: health.reason,
      telemetry,
      uptime: Math.floor(process.uptime()),
    });
  });
}
