// scripts/test-notify.js
import { sendEmail } from '../src/modules/alerts/email.adapter.js';
import { sendTelegram } from '../src/modules/alerts/telegram.adapter.js';
import { env } from '../src/config/env.js';

const testEmail = env.TEST_EMAIL_TO || env.EMAIL_USER;
const testTelegramChatId = process.env.TELEGRAM_CHAT_ID || env.TELEGRAM_CHAT_ID;

const main = async () => {
  try {
    console.log('Sending test email to:', testEmail);
    await sendEmail(testEmail, 'Zepatrol Test Email', '✅ This is a test email from Zepatrol!');
    console.log('Test email sent successfully!');
  } catch (err) {
    console.error('Failed to send test email:', err);
  }

  try {
    if (testTelegramChatId && env.TELEGRAM_BOT_TOKEN) {
      console.log('Sending test Telegram message to:', testTelegramChatId);
      await sendTelegram(testTelegramChatId, '✅ This is a test Telegram message from Zepatrol!');
      console.log('Test Telegram message sent successfully!');
    } else {
      console.log('Telegram bot token or chat ID not set, skipping Telegram test.');
    }
  } catch (err) {
    console.error('Failed to send test Telegram message:', err);
  }

  process.exit(0);
};

main(); 