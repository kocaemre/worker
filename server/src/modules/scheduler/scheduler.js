import cron from 'node-cron';
import { runChecks } from '../checks/checker.js';

/**
 * @param {{ prisma, logger, env }} deps
 */
export const scheduleJobs = ({ prisma, logger, env }) => {
  cron.schedule(env.CHECK_INTERVAL_CRON, async () => {
    logger.info('Cron triggered');
    await runChecks({ prisma, logger, env });
  });
}; 