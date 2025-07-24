// ESM version for test-alert.js
import { prisma } from '../src/prisma/client.js';
import { runChecks } from '../src/modules/checks/checker.js';

const logger = console;

const main = async () => {
  // Find a genysn node
  const node = await prisma.node.findFirst({
    where: { isMonitoring: true, blockchainProject: { category: 'genysn' } },
    include: { blockchainProject: true, user: true }
  });
  if (!node) {
    console.error('No genysn node found for test.');
    process.exit(1);
  }
  // Debug: print node and user info
  console.log('DEBUG: Found node:', JSON.stringify(node, null, 2));
  console.log('DEBUG: User email:', node.user.email);
  console.log('DEBUG: User notificationEmail:', node.user.notificationEmail);
  console.log('DEBUG: User subscriptionStatus:', node.user.subscriptionStatus);
  console.log('DEBUG: User telegram_chat_id:', node.user.telegramChatId);
  
  // Set consecutive_no_score_increase to 3 (removed reward logic)
  // Also set lastCheck to an old date to bypass interval check
  const oldDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
  await prisma.node.update({
    where: { id: node.id },
    data: {
      consecutive_no_score_increase: 3,
      lastCheck: oldDate
    }
  });
  
  console.log('DEBUG: Updated consecutive_no_score_increase to 3 and set lastCheck to:', oldDate.toISOString());
  
  // Check existing alerts before running checks
  const existingAlerts = await prisma.alert.findMany({
    where: { nodeId: node.id, isSent: false },
    orderBy: { createdAt: 'desc' }
  });
  console.log('DEBUG: Existing unsent alerts before check:', existingAlerts.length);
  
  // Run checks to trigger alert
  console.log('DEBUG: Running checks...');
  await runChecks({ prisma, logger });
  console.log('DEBUG: Checks completed.');
  
  // Check alerts after running checks
  const newAlerts = await prisma.alert.findMany({
    where: { nodeId: node.id, isSent: false },
    orderBy: { createdAt: 'desc' }
  });
  console.log('DEBUG: Unsent alerts after check:', newAlerts.length);
  console.log('DEBUG: New alerts:', JSON.stringify(newAlerts, null, 2));
  
  console.log('Test alert for score not increasing triggered.');
  process.exit(0);
};

main(); 