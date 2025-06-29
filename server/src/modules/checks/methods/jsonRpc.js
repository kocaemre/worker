import axios from 'axios';

/**
 * Perform basic JSON-RPC call (`eth_blockNumber`) to verify node.
 * @param {string} url JSON-RPC endpoint
 * @returns {{ ok: boolean, latency?: number, error?: string }}
 */
export const jsonRpcCheck = async (url) => {
  const payload = { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] };
  const start = Date.now();
  try {
    const res = await axios.post(url, payload, { timeout: 4000 });
    return { ok: !!res.data.result, latency: Date.now() - start };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}; 