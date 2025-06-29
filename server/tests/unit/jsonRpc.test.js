import { jsonRpcCheck } from '../../src/modules/checks/methods/jsonRpc.js';
import axios from 'axios';
import { jest } from '@jest/globals';

jest.mock('axios');

const successResp = { data: { result: '0x1234' } };
const failResp = { data: { error: 'invalid' } };

describe('jsonRpcCheck', () => {
  it('should return ok=true when result present', async () => {
    axios.post.mockResolvedValue(successResp);
    const res = await jsonRpcCheck('http://rpc');
    expect(res.ok).toBe(true);
  });

  it('should return ok=false when request throws', async () => {
    axios.post.mockRejectedValue(new Error('network'));
    const res = await jsonRpcCheck('http://rpc');
    expect(res.ok).toBe(false);
  });

  it('should return ok=false when result missing', async () => {
    axios.post.mockResolvedValue(failResp);
    const res = await jsonRpcCheck('http://rpc');
    expect(res.ok).toBe(false);
  });
}); 