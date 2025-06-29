import axios from 'axios';

/**
 * Perform HTTP GET check.
 * @param {string} url
 * @returns {{ ok: boolean, latency?: number }}
 */
export const httpCheck = async (url) => {
  const start = Date.now();
  const res = await axios.get(url, { timeout: 4000 });
  return { ok: res.status < 400, latency: Date.now() - start };
}; 