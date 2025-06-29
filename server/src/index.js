import { env } from './config/env.js';
import { createLogger } from './infra/logger.js';
import { prisma } from './prisma/client.js';
import { scheduleJobs } from './modules/scheduler/scheduler.js';
import { initMetricsServer } from './modules/telemetry/metrics.js';
import { startDashboard } from './modules/dashboard/dashboard.js';

const logger = createLogger(env.NODE_ENV);

try {
  await prisma.$connect();
  logger.info('Connected to database');

  initMetricsServer(logger);
  startDashboard(3000);

  scheduleJobs({ prisma, logger, env });

  logger.info('Zepatrol worker started');
  logger.info('📊 Dashboard available at http://localhost:3000');
} catch (err) {
  logger.error({ err }, 'Failed to start');
  process.exit(1);
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  await prisma.$disconnect();
  process.exit(0);
}); 