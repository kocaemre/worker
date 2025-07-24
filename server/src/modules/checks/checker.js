import { httpCheck } from './methods/http.js';
import { jsonRpcCheck } from './methods/jsonRpc.js';
import { pingCheck } from './methods/ping.js';
import { apiCheck } from './methods/api.js';
import { sendAlert } from '../alerts/alert.service.js';
import axios from 'axios';

/**
 * Run health checks for due nodes (based on lastCheck + plan interval).
 * @param {{ prisma, logger }} deps
 */
export const runChecks = async ({ prisma, logger }) => {
  const nodes = await prisma.node.findMany({
    where: { isMonitoring: true },
    include: { user: true, blockchainProject: true },
  });

  for (const node of nodes) {
    // Plan-based interval
    const plan = node.user.subscriptionStatus;
    const { validationMethod, validationUrl, category } = node.blockchainProject;
    let intervalMs;
    if (category === 'genysn') {
      intervalMs = plan === 'premium' ? 2 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 2 saat premium, 24 saat free
    } else {
      intervalMs = plan === 'premium' ? 15 * 60_000 : 24 * 60 * 60_000;
    }
    if (node.lastCheck && Date.now() - node.lastCheck.getTime() < intervalMs) {
      // Not time to check yet
      continue;
    }

    // kullanıcı girdisi (keyword) nodeConfig JSON'ından alınıyor
    let keyword = '';
    try {
      const cfg = JSON.parse(node.nodeConfig ?? '{}');
      keyword = Object.values(cfg)[0] ?? '';
    } catch (e) {
      logger.error({ nodeId: node.id }, 'Invalid nodeConfig JSON');
    }

    let result;
    let score = null;
    let scoreIncreased = false;
    let scoreUpdate = null;
    let isFailure = false;
    try {
      switch (validationMethod) {
        case 'jsonRpc':
          result = await jsonRpcCheck(validationUrl);
          break;
        case 'ping':
          result = await pingCheck(validationUrl);
          break;
        case 'api':
          if (category === 'genysn') {
            const start = Date.now();
            try {
              const res = await import('./methods/api.js').then(m => m.apiCheck(validationUrl, keyword));
              const apiRes = await axios.get(`${validationUrl}${encodeURIComponent(keyword)}`, { timeout: 4000 });
              const data = apiRes.data;
              score = typeof data.score === 'number' ? data.score : null;
              scoreUpdate = new Date();
              scoreIncreased = score !== null && (node.last_score == null || score > node.last_score);
              result = {
                ok: data.online === true && scoreIncreased,
                latency: Date.now() - start,
                error: data.online !== true ? 'Node offline (online:false)' : (!scoreIncreased ? 'Score not increasing' : undefined),
                data
              };
            } catch (err) {
              result = { ok: false, error: err.message };
            }
          } else {
            result = await apiCheck(validationUrl, keyword);
          }
          break;
        default:
          result = await httpCheck(validationUrl);
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }

    // Failure (HTTP error, timeout, online:false, reward/score not increasing etc.)
    isFailure = !result.ok;
    let consecutive_failures = node.consecutive_failures || 0;
    let last_failure_at = node.last_failure_at || null;
    if (isFailure) {
      consecutive_failures += 1;
      last_failure_at = new Date();
    } else {
      consecutive_failures = 0;
      last_failure_at = null;
    }

    // Only send alert if 3 or more consecutive failures
    let genysNoScoreAlert = false;
    if (category === 'genysn') {
      // Check if we already have 3 consecutive no score increases  
      if ((node.consecutive_no_score_increase || 0) >= 3) {
        genysNoScoreAlert = true;
        console.log('DEBUG: Creating no_score_increase alert - consecutive count:', (node.consecutive_no_score_increase || 0));
      }
    }

    if (isFailure && consecutive_failures >= 3) {
      console.log('DEBUG: Creating downtime alert for node', node.id, node.name);
      await prisma.alert.create({
        data: {
          userId: node.userId,
          nodeId: node.id,
          type: 'downtime',
          severity: 'high',
          message: `Node ${node.name} is down: ${result.error ?? 'Unknown error'}`,
          isSent: false,
        },
      });
      console.log('DEBUG: Downtime alert created');
      await sendAlert({ node, result, logger, prisma });
    }

    if (genysNoScoreAlert) {
      // Aynı node ve aynı tipte isSent=false alert var mı kontrol et
      const existingUnsent = await prisma.alert.findFirst({
        where: {
          nodeId: node.id,
          type: 'no_score_increase',
          isSent: false
        }
      });
      if (!existingUnsent) {
        console.log('DEBUG: Creating no_score_increase alert for node', node.id, node.name);
        await prisma.alert.create({
          data: {
            userId: node.userId,
            nodeId: node.id,
            type: 'no_score_increase',
            severity: 'medium',
            message: `Node ${node.name} has not increased its score for 3 consecutive checks!`,
            isSent: false,
          },
        });
        console.log('DEBUG: no_score_increase alert created');
        await sendAlert({ node, result: { ...result, error: 'Score not increasing' }, logger, prisma });
        // Sayaç sıfırla
        await prisma.node.update({
          where: { id: node.id },
          data: { consecutive_no_score_increase: 0 }
        });
      } else {
        console.log('DEBUG: Skipping duplicate no_score_increase alert for node', node.id, node.name);
      }
    }

    const updateData = {
      lastCheck: new Date(),
      lastResponseTime: result.latency ?? null,
      status: result.ok ? 'healthy' : 'unhealthy',
      lastError: result.ok ? null : result.error ?? 'unknown',
      consecutive_failures,
      last_failure_at,
    };
    if (category === 'genysn') {
      updateData.last_score = score;
      updateData.last_score_update = scoreUpdate;
      updateData.consecutive_no_score_increase = scoreIncreased ? 0 : (node.consecutive_no_score_increase || 0) + 1;
    }

    await prisma.node.update({
      where: { id: node.id },
      data: updateData,
    });
  }
}; 