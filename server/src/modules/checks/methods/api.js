import axios from 'axios';

/**
 * Append keyword to base URL and perform GET.
 * @param {string} baseUrl e.g., https://x.com/name=
 * @param {string} keyword user supplied string
 */
export const apiCheck = async (baseUrl, keyword = '') => {
  const param = decodeURIComponent(keyword);
  const url = `${baseUrl}${encodeURIComponent(param)}`;
  const start = Date.now();
  try {
    const res = await axios.get(url, { timeout: 4000 });
    return { ok: res.status < 400, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}; 