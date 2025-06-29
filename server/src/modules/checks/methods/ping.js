import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Ping host once to ensure reachability (Unix-only).
 * @param {string} host Host or IP
 * @returns {{ ok: boolean, latency?: number, error?: string }}
 */
export const pingCheck = async (host) => {
  const start = Date.now();
  try {
    await execAsync(`ping -c 1 -W 2 ${host}`);
    return { ok: true, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}; 