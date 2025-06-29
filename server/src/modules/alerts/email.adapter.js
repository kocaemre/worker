import nodemailer from 'nodemailer';
import { env } from '../../config/env.js';

const transport = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
});

/**
 * Send email.
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 */
export const sendEmail = (to, subject, text) =>
  transport.sendMail({ from: env.EMAIL_USER, to, subject, text }); 