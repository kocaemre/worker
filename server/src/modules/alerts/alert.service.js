import { sendEmail } from './email.adapter.js';

/**
 * Send alert for failed node.
 */
export const sendAlert = async ({ node, result, logger, prisma }) => {
  const subject = `⚠️ Node "${node.name}" DOWN`;
  const body = `Health check failed for node "${node.name}" (${node.blockchainProject.displayName})\nError: ${result.error ?? 'unknown'}`;

  logger.warn({ nodeId: node.id }, 'Sending alert');

  // Send email to notification email or regular email
  const emailTo = node.user.notificationEmail || node.user.email;
  if (emailTo) {
    await sendEmail(emailTo, subject, body);
    
    // Mark alerts as sent
    await prisma.alert.updateMany({
      where: {
        nodeId: node.id,
        isSent: false,
        type: 'downtime'
      },
      data: { isSent: true }
    });
  }

  // Send Telegram for premium users
  if (node.user.subscriptionStatus === 'premium' && node.user.telegramChatId) {
    const { sendTelegram } = await import('./telegram.adapter.js');
    await sendTelegram(node.user.telegramChatId, body);
  }
}; 