import cron from 'node-cron';
import { runChecks } from '../checks/checker.js';
import { runDailySummary } from '../alerts/daily-summary-runner.js';

/**
 * @param {{ prisma, logger, env }} deps
 */
export const scheduleJobs = ({ prisma, logger, env }) => {
  // Schedule regular health checks
  cron.schedule(env.CHECK_INTERVAL_CRON, async () => {
    logger.info('Cron triggered');
    await runChecks({ prisma, logger });
  });

  // Schedule daily summary at 17:00 UTC
  cron.schedule('0 17 * * *', async () => {
    logger.info('Daily summary cron triggered');
    await runDailySummary({ prisma, logger });
  });
}; 