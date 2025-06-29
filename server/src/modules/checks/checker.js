import { httpCheck } from './methods/http.js';
import { jsonRpcCheck } from './methods/jsonRpc.js';
import { pingCheck } from './methods/ping.js';
import { apiCheck } from './methods/api.js';
import { sendAlert } from '../alerts/alert.service.js';

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
    // Plan bazlı sıklık kontrolü
    const plan = node.user.subscriptionStatus;
    const intervalMs = plan === 'premium' ? 15 * 60_000 : 24 * 60 * 60_000;
    if (node.lastCheck && Date.now() - node.lastCheck.getTime() < intervalMs) {
      // Henüz kontrol zamanı gelmedi
      continue; // eslint-disable-line no-continue
    }

    const { validationMethod, validationUrl } = node.blockchainProject;
    // kullanıcı girdisi (keyword) nodeConfig JSON'ından alınıyor
    let keyword = '';
    try {
      const cfg = JSON.parse(node.nodeConfig ?? '{}');
      keyword = Object.values(cfg)[0] ?? '';
    } catch (e) {
      logger.error({ nodeId: node.id }, 'Invalid nodeConfig JSON');
    }

    let result;
    try {
      switch (validationMethod) {
        case 'jsonRpc':
          result = await jsonRpcCheck(validationUrl);
          break;
        case 'ping':
          result = await pingCheck(validationUrl);
          break;
        case 'api':
          result = await apiCheck(validationUrl, keyword);
          break;
        default:
          result = await httpCheck(validationUrl);
      }
    } catch (err) {
      result = { ok: false, error: err.message };
    }

    // Create alert if unhealthy
    if (!result.ok) {
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
    }

    await prisma.node.update({
      where: { id: node.id },
      data: {
        lastCheck: new Date(),
        lastResponseTime: result.latency ?? null,
        status: result.ok ? 'healthy' : 'unhealthy',
        lastError: result.ok ? null : result.error ?? 'unknown',
      },
    });

    if (!result.ok) {
      await sendAlert({ node, result, logger, prisma });
    }
  }
}; 