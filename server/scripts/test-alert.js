#!/usr/bin/env node
import { env } from '../src/config/env.js';
import { createLogger } from '../src/infra/logger.js';
import { sendEmail } from '../src/modules/alerts/email.adapter.js';
import { sendTelegram } from '../src/modules/alerts/telegram.adapter.js';

const logger = createLogger('development');

(async () => {
  logger.info('Sending test e-mail & telegram…');

  // Email
  try {
    const testEmailTo = env.TEST_EMAIL_TO || env.EMAIL_USER;
    await sendEmail(testEmailTo, 'Zepatrol Test E-mail', '✅ Mail ayarları çalışıyor!');
    logger.info(`Test e-mail sent to ${testEmailTo}`);
  } catch (err) {
    logger.error({ err }, 'Failed to send test e-mail');
  }

  // Telegram (opsiyonel)
  if (env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    try {
      await sendTelegram(process.env.TELEGRAM_CHAT_ID, '✅ Zepatrol Telegram testi başarılı!');
      logger.info('Test telegram sent');
    } catch (err) {
      logger.error({ err }, 'Failed to send test telegram');
    }
  } else {
    logger.info('Telegram not configured – skipping');
  }

  process.exit(0);
})(); 