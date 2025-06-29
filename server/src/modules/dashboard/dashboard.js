import express from 'express';
import { prisma } from '../prisma/client.js';

const app = express();

// Dashboard endpoint
app.get('/', async (req, res) => {
  try {
    // Get all nodes with their latest checks
    const nodes = await prisma.node.findMany({
      include: {
        user: {
          select: { email: true, plan: true }
        },
        checks: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    // Get total stats
    const totalNodes = await prisma.node.count();
    const totalUsers = await prisma.user.count();
    const totalChecks = await prisma.check.count();
    const healthyNodes = await prisma.check.count({
      where: {
        ok: true,
        createdAt: {
          gte: new Date(Date.now() - 30 * 60 * 1000) // Son 30 dakika
        }
      }
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Zepatrol Worker Dashboard</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }
        .stat-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2em; font-weight: bold; color: #2563eb; }
        .nodes-table { background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: bold; }
        .status-ok { color: #059669; font-weight: bold; }
        .status-error { color: #dc2626; font-weight: bold; }
        .status-pending { color: #d97706; font-weight: bold; }
        .refresh-info { text-align: center; margin-top: 20px; color: #666; }
        .next-check { font-size: 0.9em; color: #666; }
    </style>
    <script>
        // Auto refresh every 30 seconds
        setTimeout(() => location.reload(), 30000);
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Zepatrol Worker Dashboard</h1>
            <p>Real-time blockchain node monitoring status</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-number">${totalNodes}</div>
                <div>Total Nodes</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalUsers}</div>
                <div>Total Users</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${totalChecks}</div>
                <div>Total Checks</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${healthyNodes}</div>
                <div>Healthy (30m)</div>
            </div>
        </div>

        <div class="nodes-table">
            <table>
                <thead>
                    <tr>
                        <th>Node URL</th>
                        <th>Method</th>
                        <th>User</th>
                        <th>Plan</th>
                        <th>Last Check</th>
                        <th>Status</th>
                        <th>Latency</th>
                        <th>Next Check</th>
                    </tr>
                </thead>
                <tbody>
                    ${nodes.map(node => {
                      const lastCheck = node.checks[0];
                      const nextCheck = new Date(node.nextCheckAt);
                      const now = new Date();
                      const timeUntilNext = nextCheck > now ? 
                        `${Math.ceil((nextCheck - now) / (1000 * 60))}m` : 
                        'Due now';
                      
                      return `
                        <tr>
                            <td><code>${node.url}</code></td>
                            <td><span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${node.method}</span></td>
                            <td>${node.user.email}</td>
                            <td><span style="background: ${node.user.plan === 'premium' ? '#dcfce7; color: #166534' : '#fef3c7; color: #92400e'}; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${node.user.plan}</span></td>
                            <td>${lastCheck ? new Date(lastCheck.createdAt).toLocaleString() : 'Never'}</td>
                            <td class="${lastCheck ? (lastCheck.ok ? 'status-ok' : 'status-error') : 'status-pending'}">
                                ${lastCheck ? (lastCheck.ok ? '✅ OK' : '❌ Error') : '⏳ Pending'}
                            </td>
                            <td>${lastCheck?.latencyMs ? lastCheck.latencyMs + 'ms' : '-'}</td>
                            <td class="next-check">${timeUntilNext}</td>
                        </tr>
                      `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="refresh-info">
            <p>📊 Last updated: ${new Date().toLocaleString()} • Auto-refresh in 30s</p>
        </div>
    </div>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint for JSON data
app.get('/api/status', async (req, res) => {
  try {
    const stats = {
      totalNodes: await prisma.node.count(),
      totalUsers: await prisma.user.count(),
      totalChecks: await prisma.check.count(),
      healthyNodes: await prisma.check.count({
        where: {
          ok: true,
          createdAt: {
            gte: new Date(Date.now() - 30 * 60 * 1000)
          }
        }
      }),
      timestamp: new Date().toISOString()
    };
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export const startDashboard = (port = 3000) => {
  app.listen(port, () => {
    console.log(`📊 Dashboard available at http://localhost:${port}`);
  });
}; 