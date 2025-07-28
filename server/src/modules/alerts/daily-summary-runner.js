import { generateDailySummary, sendDailySummaryEmail, sendDailySummaryTelegram } from './daily-summary.service.js';

/**
 * Run daily summary for all users
 */
export const runDailySummary = async ({ prisma, logger }) => {
  logger.info('Starting daily summary generation');

  try {
    // Get all users with nodes
    const users = await prisma.user.findMany({
      where: {
        nodes: {
          some: {
            isMonitoring: true
          }
        }
      },
      include: {
        nodes: {
          where: {
            isMonitoring: true
          },
          include: {
            blockchainProject: true
          }
        }
      }
    });

    logger.info({ userCount: users.length }, 'Found users for daily summary');

    let successCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        if (user.nodes.length === 0) {
          logger.debug({ userId: user.id }, 'User has no active nodes, skipping');
          continue;
        }

        // Generate summary for this user
        const summary = await generateDailySummary({
          user,
          nodes: user.nodes,
          logger,
          prisma
        });

        // Send email summary
        await sendDailySummaryEmail({
          user,
          summary,
          logger
        });

        // Send telegram summary (for premium users)
        if (user.subscriptionStatus === 'premium') {
          await sendDailySummaryTelegram({
            user,
            summary,
            logger
          });
        }

        successCount++;
        logger.info({ userId: user.id, nodeCount: user.nodes.length }, 'Daily summary sent successfully');

      } catch (error) {
        errorCount++;
        logger.error({ userId: user.id, error: error.message }, 'Failed to send daily summary for user');
      }
    }

    logger.info({ 
      totalUsers: users.length, 
      successCount, 
      errorCount 
    }, 'Daily summary generation completed');

  } catch (error) {
    logger.error({ error: error.message }, 'Failed to run daily summary');
    throw error;
  }
}; 