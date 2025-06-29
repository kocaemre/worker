import pino from 'pino';

export const createLogger = (env = 'development') =>
  pino(
    env === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {},
  ); 