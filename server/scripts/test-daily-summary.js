import { PrismaClient } from '@prisma/client';
import { runDailySummary } from '../src/modules/alerts/daily-summary-runner.js';
import { createLogger } from '../src/infra/logger.js';

const prisma = new PrismaClient();
const logger = createLogger();

async function testDailySummary() {
  try {
    logger.info('Starting daily summary test');
    
    await runDailySummary({ prisma, logger });
    
    logger.info('Daily summary test completed successfully');
  } catch (error) {
    logger.error({ error: error.message }, 'Daily summary test failed');
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDailySummary(); 