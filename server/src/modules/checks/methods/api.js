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
    if (res.status === 200 && res.data && res.data.online === true) {
      return { ok: true, latency: Date.now() - start };
    }
    // Eğer online false ise veya başka bir durum varsa
    return {
      ok: false,
      error: res.data && res.data.online === false
        ? 'Node offline (online:false)'
        : `Unexpected response: ${JSON.stringify(res.data)}`,
      latency: Date.now() - start
    };
  } catch (err) {
    // HTTP 400 veya başka bir hata
    return { ok: false, error: err.message };
  }
}; 