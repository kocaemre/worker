import { Telegraf } from 'telegraf';
import { env } from '../../config/env.js';

const bot = env.TELEGRAM_BOT_TOKEN ? new Telegraf(env.TELEGRAM_BOT_TOKEN) : null;

/**
 * Send Telegram message if bot configured.
 * @param {string} chatId
 * @param {string} text
 */
export const sendTelegram = async (chatId, text) => {
  if (!bot) return;
  await bot.telegram.sendMessage(chatId, text);
}; 