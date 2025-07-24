import express from 'express';
import { prisma } from '../../prisma/client.js';

const app = express();

// Dashboard endpoint
app.get('/', async (req, res) => {
  try {
    // Get all nodes with their blockchain projects and latest alerts
    const nodes = await prisma.node.findMany({
      include: {
        user: {
          select: { email: true, subscriptionStatus: true }
        },
        blockchainProject: {
          select: { name: true, displayName: true, category: true }
        },
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    // Get total stats
    const totalNodes = await prisma.node.count();
    const totalUsers = await prisma.user.count();
    const totalAlerts = await prisma.alert.count();
    const healthyNodes = await prisma.node.count({
      where: {
        status: 'healthy',
        lastCheck: {
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
                 <div class="stat-number">${totalAlerts}</div>
                 <div>Total Alerts</div>
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
                         <th>Node Name</th>
                         <th>Blockchain Project</th>
                         <th>User</th>
                         <th>Plan</th>
                         <th>Last Check</th>
                         <th>Next Check</th>
                         <th>Status</th>
                         <th>Response Time</th>
                         <th>Monitoring</th>
                         <th>Reward</th>
                         <th>Score</th>
                         <th>Reward Artmama</th>
                         <th>Score Artmama</th>
                         <th>Ardışık Hata</th>
                         <th>Son Alertler</th>
                     </tr>
                 </thead>
                <tbody>
                                         ${nodes.map(node => {
                       const lastCheckTime = node.lastCheck ? new Date(node.lastCheck).toLocaleString() : 'Never';
                       const plan = node.user.subscriptionStatus;
                       const isGenys = node.blockchainProject.category === 'genys';
                       const intervalMs = isGenys ? 30 * 60 * 1000 : (plan === 'premium' ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000);
                       let nextCheck = '-';
                       if (node.lastCheck) {
                         const next = new Date(new Date(node.lastCheck).getTime() + intervalMs);
                         nextCheck = next.toLocaleString();
                       }
                       const statusColor = node.status === 'healthy' ? 'status-ok' : 
                                          node.status === 'unhealthy' ? 'status-error' : 'status-pending';
                       const statusIcon = node.status === 'healthy' ? '✅ Healthy' : 
                                         node.status === 'unhealthy' ? '❌ Unhealthy' : 
                                         node.status === 'offline' ? '⚫ Offline' : '⏳ Unknown';
                       const planColor = node.user.subscriptionStatus === 'premium' ? '#dcfce7; color: #166534' : '#fef3c7; color: #92400e';
                       // Genys özel alanlar
                       const reward = isGenys ? (node.lastReward ?? '-') : '-';
                       const score = isGenys ? (node.lastScore ?? '-') : '-';
                       const noReward = isGenys ? (node.consecutiveNoRewardIncrease ?? 0) : '-';
                       const noScore = isGenys ? (node.consecutiveNoScoreIncrease ?? 0) : '-';
                       const failures = node.consecutiveFailures ?? 0;
                       const lastAlerts = node.alerts && node.alerts.length > 0 ? node.alerts.map(a => a.type).join(', ') : '-';
                       
                       return `
                         <tr>
                             <td><strong>${node.name}</strong></td>
                             <td><span style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${node.blockchainProject.displayName}</span></td>
                             <td>${node.user.email ? `<span style="display:inline-block;width:28px;height:28px;background:#2563eb;color:white;border-radius:50%;text-align:center;line-height:28px;font-weight:bold;">${node.user.email[0].toUpperCase()}</span>` : 'N/A'}</td>
                             <td><span style="background: ${planColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.8em;">${node.user.subscriptionStatus}</span></td>
                             <td>${lastCheckTime}</td>
                             <td>${nextCheck}</td>
                             <td class="${statusColor}">
                                 ${statusIcon}
                             </td>
                             <td>${node.lastResponseTime ? node.lastResponseTime + 'ms' : '-'}</td>
                             <td>${node.isMonitoring ? '🟢 Active' : '🔴 Paused'}</td>
                             <td>${reward}</td>
                             <td>${score}</td>
                             <td>${noReward}</td>
                             <td>${noScore}</td>
                             <td>${failures}</td>
                             <td>${lastAlerts}</td>
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
      totalAlerts: await prisma.alert.count(),
      healthyNodes: await prisma.node.count({
        where: {
          status: 'healthy',
          lastCheck: {
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