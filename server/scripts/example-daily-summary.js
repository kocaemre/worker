/**
 * Example: Daily Summary System
 * 
 * This script demonstrates how the daily summary system works:
 * 1. Generates performance summaries for all users
 * 2. Calculates 24-hour changes in scores and rewards
 * 3. Sends formatted reports via email and Telegram
 * 
 * Usage: node scripts/example-daily-summary.js
 */

import { PrismaClient } from '@prisma/client';
import { generateDailySummary } from '../src/modules/alerts/daily-summary.service.js';
import { createLogger } from '../src/infra/logger.js';

const prisma = new PrismaClient();
const logger = createLogger();

async function exampleDailySummary() {
  try {
    logger.info('=== Daily Summary System Example ===');
    
    // Get a sample user with nodes
    const user = await prisma.user.findFirst({
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

    if (!user) {
      logger.info('No users with active nodes found');
      return;
    }

    logger.info(`Processing user: ${user.name} (${user.email})`);
    logger.info(`Active nodes: ${user.nodes.length}`);

    // Generate summary
    const summary = await generateDailySummary({
      user,
      nodes: user.nodes,
      logger,
      prisma
    });

    // Display summary details
    logger.info('=== Generated Summary ===');
    logger.info(`Date: ${summary.date}`);
    logger.info(`Total Nodes: ${summary.totalNodes}`);
    logger.info(`Active Nodes: ${summary.activeNodes}`);
    logger.info(`Total Alerts (24h): ${summary.totalAlerts}`);

    logger.info('\n=== Node Details ===');
    summary.nodeSummaries.forEach((node, index) => {
      logger.info(`\nNode ${index + 1}: ${node.name}`);
      logger.info(`  Project: ${node.project}`);
      logger.info(`  Status: ${node.status}`);
      logger.info(`  Uptime: ${node.uptime.toFixed(1)}%`);
      logger.info(`  Alerts (24h): ${node.alerts24h}`);
      logger.info(`  Score: ${node.currentScore || 'N/A'} (${node.scoreChange || 'unknown'})`);
      logger.info(`  Reward: ${node.currentReward || 'N/A'} (${node.rewardChange || 'unknown'})`);
      
      if (node.scoreChangeAmount !== undefined) {
        logger.info(`  Score Change: ${node.scoreChangeAmount > 0 ? '+' : ''}${node.scoreChangeAmount.toFixed(1)}`);
      }
      if (node.rewardChangeAmount !== undefined) {
        logger.info(`  Reward Change: ${node.rewardChangeAmount > 0 ? '+' : ''}${node.rewardChangeAmount.toFixed(1)}`);
      }
    });

    logger.info('\n=== Summary Complete ===');
    logger.info('In production, this summary would be sent via:');
    logger.info('  - Email to: ' + (user.notificationEmail || user.email));
    if (user.subscriptionStatus === 'premium' && user.telegramChatId) {
      logger.info('  - Telegram to: ' + user.telegramChatId);
    }

  } catch (error) {
    logger.error({ error: error.message }, 'Example failed');
  } finally {
    await prisma.$disconnect();
  }
}

exampleDailySummary(); 