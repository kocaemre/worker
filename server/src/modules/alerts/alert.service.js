import { sendEmail } from './email.adapter.js';

/**
 * Send alert for failed node.
 */
export const sendAlert = async ({ node, result, logger }) => {
  const subject = `⚠️ Node ${node.id} DOWN`;
  const body = `Health check failed for ${node.url}\nError: ${result.error ?? 'unknown'}`;

  logger.warn({ nodeId: node.id }, 'Sending alert');

  await sendEmail(node.user.email, subject, body);
  if (node.user.plan === 'premium' && node.user.telegramChatId) {
    const { sendTelegram } = await import('./telegram.adapter.js');
    await sendTelegram(node.user.telegramChatId, body);
  }
  // Telegram support can be added in future.
}; 