import { sendEmail } from './email.adapter.js';

/**
 * Generate daily summary for a user's nodes
 */
export const generateDailySummary = async ({ user, nodes, logger, prisma }) => {
  const summaryDate = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const summary = {
    date: summaryDate,
    totalNodes: nodes.length,
    activeNodes: 0,
    totalAlerts: 0,
    nodeSummaries: []
  };

  for (const node of nodes) {
    // Get alerts for this node in the last 24 hours
    const alerts = await prisma.alert.findMany({
      where: {
        nodeId: node.id,
        createdAt: {
          gte: yesterday
        }
      }
    });

    // Get node performance data
    const nodeSummary = {
      id: node.id,
      name: node.name,
      project: node.blockchainProject.displayName || node.blockchainProject.name,
      category: node.blockchainProject.category,
      status: node.status,
      uptime: node.uptimePercentage || 0,
      lastCheck: node.lastCheck,
      lastResponseTime: node.lastResponseTime,
      alerts24h: alerts.length,
      currentScore: node.last_score,
      currentReward: node.last_reward,
      scoreChange: null,
      rewardChange: null,
      consecutiveFailures: node.consecutive_failures || 0,
      consecutiveNoScoreIncrease: node.consecutive_no_score_increase || 0,
      consecutiveNoRewardIncrease: node.consecutive_no_reward_increase || 0
    };

    // Get historical data for comparison
    const yesterdayRecord = await prisma.nodePerformanceHistory.findFirst({
      where: {
        nodeId: node.id,
        recordedAt: {
          gte: yesterday,
          lt: new Date()
        }
      },
      orderBy: {
        recordedAt: 'desc'
      }
    });

    // Calculate score and reward changes
    if (node.last_score !== null && yesterdayRecord && yesterdayRecord.score !== null) {
      const scoreChange = node.last_score - yesterdayRecord.score;
      nodeSummary.scoreChange = scoreChange > 0 ? 'increasing' : scoreChange < 0 ? 'decreasing' : 'stagnant';
      nodeSummary.scoreChangeAmount = scoreChange;
    } else if (node.last_score !== null) {
      nodeSummary.scoreChange = node.consecutive_no_score_increase === 0 ? 'increasing' : 'stagnant';
    }
    
    if (node.last_reward !== null && yesterdayRecord && yesterdayRecord.reward !== null) {
      const rewardChange = node.last_reward - yesterdayRecord.reward;
      nodeSummary.rewardChange = rewardChange > 0 ? 'increasing' : rewardChange < 0 ? 'decreasing' : 'stagnant';
      nodeSummary.rewardChangeAmount = rewardChange;
    } else if (node.last_reward !== null) {
      nodeSummary.rewardChange = node.consecutive_no_reward_increase === 0 ? 'increasing' : 'stagnant';
    }



    if (node.status === 'online') {
      summary.activeNodes++;
    }

    summary.totalAlerts += alerts.length;
    summary.nodeSummaries.push(nodeSummary);
  }

  return summary;
};

/**
 * Send daily summary email
 */
export const sendDailySummaryEmail = async ({ user, summary, logger }) => {
  const emailTo = user.notificationEmail || user.email;
  
  if (!emailTo) {
    logger.warn({ userId: user.id }, 'No email address found for daily summary');
    return;
  }

  const subject = `📊 Daily Node Summary - ${summary.date}`;
  
  // Generate text version
  const textBody = generateSummaryText(summary, user.name);
  
  // Generate HTML version
  const htmlBody = generateSummaryHTML(summary, user.name);

  try {
    await sendEmail(emailTo, subject, textBody, htmlBody);
    logger.info({ userId: user.id, emailTo }, 'Daily summary email sent successfully');
  } catch (error) {
    logger.error({ userId: user.id, emailTo, error: error.message }, 'Failed to send daily summary email');
  }
};

/**
 * Send daily summary telegram message
 */
export const sendDailySummaryTelegram = async ({ user, summary, logger }) => {
  if (!user.telegramChatId) {
    logger.warn({ userId: user.id }, 'No telegram chat ID found for daily summary');
    return;
  }

  try {
    const { sendTelegram } = await import('./telegram.adapter.js');
    const telegramMessage = generateSummaryTelegram(summary, user.name);
    
    await sendTelegram(user.telegramChatId, telegramMessage);
    logger.info({ userId: user.id, chatId: user.telegramChatId }, 'Daily summary telegram sent successfully');
  } catch (error) {
    logger.error({ userId: user.id, chatId: user.telegramChatId, error: error.message }, 'Failed to send daily summary telegram');
  }
};

/**
 * Generate text version of daily summary
 */
const generateSummaryText = (summary, userName) => {
  const statusEmoji = summary.activeNodes === summary.totalNodes ? '🟢' : '🟡';
  const alertEmoji = summary.totalAlerts > 0 ? '⚠️' : '✅';

  let text = `
Dear ${userName || 'User'},

Here's your daily node summary for ${summary.date}:

OVERVIEW:
${statusEmoji} Active Nodes: ${summary.activeNodes}/${summary.totalNodes}
${alertEmoji} Total Alerts (24h): ${summary.totalAlerts}

NODE DETAILS:
`;

     summary.nodeSummaries.forEach(node => {
     const nodeStatus = node.status === 'online' ? '🟢' : '🔴';
     const scoreStatus = node.scoreChange === 'increasing' ? '📈' : node.scoreChange === 'decreasing' ? '📉' : '➡️';
     const rewardStatus = node.rewardChange === 'increasing' ? '💰' : node.rewardChange === 'decreasing' ? '📉' : '➡️';
     
     let scoreText = `${scoreStatus} Score: ${node.currentScore || 'N/A'}`;
     if (node.scoreChangeAmount !== undefined) {
       const changeText = node.scoreChangeAmount > 0 ? `(+${node.scoreChangeAmount.toFixed(1)})` : `(${node.scoreChangeAmount.toFixed(1)})`;
       scoreText += ` ${changeText}`;
     }
     
     let rewardText = `${rewardStatus} Reward: ${node.currentReward || 'N/A'}`;
     if (node.rewardChangeAmount !== undefined) {
       const changeText = node.rewardChangeAmount > 0 ? `(+${node.rewardChangeAmount.toFixed(1)})` : `(${node.rewardChangeAmount.toFixed(1)})`;
       rewardText += ` ${changeText}`;
     }
     
     text += `
 ${nodeStatus} ${node.name} (${node.project})
    Status: ${node.status}
    Uptime: ${node.uptime.toFixed(1)}%
    Alerts (24h): ${node.alerts24h}
    ${scoreText}
    ${rewardText}
 `;
   });

  text += `

Keep monitoring your nodes for optimal performance!

Best regards,
ZePatrol Monitoring Team
  `.trim();

  return text;
};

/**
 * Generate HTML version of daily summary
 */
const generateSummaryHTML = (summary, userName) => {
  const statusEmoji = summary.activeNodes === summary.totalNodes ? '🟢' : '🟡';
  const alertEmoji = summary.totalAlerts > 0 ? '⚠️' : '✅';

  let nodeRows = '';
     summary.nodeSummaries.forEach(node => {
     const nodeStatus = node.status === 'online' ? '🟢' : '🔴';
     const scoreStatus = node.scoreChange === 'increasing' ? '📈' : node.scoreChange === 'decreasing' ? '📉' : '➡️';
     const rewardStatus = node.rewardChange === 'increasing' ? '💰' : node.rewardChange === 'decreasing' ? '📉' : '➡️';
     
     let scoreText = `${scoreStatus} ${node.currentScore || 'N/A'}`;
     if (node.scoreChangeAmount !== undefined) {
       const changeText = node.scoreChangeAmount > 0 ? ` (+${node.scoreChangeAmount.toFixed(1)})` : ` (${node.scoreChangeAmount.toFixed(1)})`;
       scoreText += changeText;
     }
     
     let rewardText = `${rewardStatus} ${node.currentReward || 'N/A'}`;
     if (node.rewardChangeAmount !== undefined) {
       const changeText = node.rewardChangeAmount > 0 ? ` (+${node.rewardChangeAmount.toFixed(1)})` : ` (${node.rewardChangeAmount.toFixed(1)})`;
       rewardText += changeText;
     }
     
     nodeRows += `
       <tr style="border-bottom: 1px solid #dee2e6;">
         <td style="padding: 12px; font-weight: bold;">${nodeStatus} ${node.name}</td>
         <td style="padding: 12px;">${node.project}</td>
         <td style="padding: 12px; color: ${node.status === 'online' ? '#28a745' : '#dc3545'}; font-weight: bold;">${node.status}</td>
         <td style="padding: 12px;">${node.uptime.toFixed(1)}%</td>
         <td style="padding: 12px;">${node.alerts24h}</td>
         <td style="padding: 12px;">${scoreText}</td>
         <td style="padding: 12px;">${rewardText}</td>
       </tr>
     `;
   });

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Node Summary</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9;">
    <div style="max-width: 800px; margin: 0 auto; background: white; border-radius: 8px; padding: 0; border: 1px solid #ddd;">
        
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px; font-weight: normal;">📊 Daily Node Summary</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 18px;">${summary.date}</p>
        </div>
        
        <div style="padding: 30px;">
            <p>Dear <strong>${userName || 'User'}</strong>,</p>
            
            <p>Here's your daily node performance summary:</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 30px 0;">
                <div style="background: #e8f5e8; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 10px;">${statusEmoji}</div>
                    <div style="font-size: 18px; font-weight: bold; color: #28a745;">Active Nodes</div>
                    <div style="font-size: 24px; color: #28a745;">${summary.activeNodes}/${summary.totalNodes}</div>
                </div>
                
                <div style="background: ${summary.totalAlerts > 0 ? '#fff3cd' : '#e8f5e8'}; padding: 20px; border-radius: 8px; text-align: center;">
                    <div style="font-size: 24px; margin-bottom: 10px;">${alertEmoji}</div>
                    <div style="font-size: 18px; font-weight: bold; color: ${summary.totalAlerts > 0 ? '#856404' : '#28a745'};">Alerts (24h)</div>
                    <div style="font-size: 24px; color: ${summary.totalAlerts > 0 ? '#856404' : '#28a745'};">${summary.totalAlerts}</div>
                </div>
            </div>
            
            <h3 style="color: #495057; margin-top: 30px;">Node Performance Details</h3>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
                    <thead>
                        <tr style="background: #495057; color: white;">
                            <th style="padding: 12px; text-align: left;">Node</th>
                            <th style="padding: 12px; text-align: left;">Project</th>
                            <th style="padding: 12px; text-align: left;">Status</th>
                            <th style="padding: 12px; text-align: left;">Uptime</th>
                            <th style="padding: 12px; text-align: left;">Alerts</th>
                            <th style="padding: 12px; text-align: left;">Score</th>
                            <th style="padding: 12px; text-align: left;">Reward</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nodeRows}
                    </tbody>
                </table>
            </div>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0066cc;">💡 Performance Insights</h3>
                <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>📈 Nodes with increasing scores are performing well</li>
                    <li>💰 Nodes with increasing rewards are earning effectively</li>
                    <li>⚠️ High alert counts may indicate issues requiring attention</li>
                    <li>🟢 All nodes online means optimal network participation</li>
                </ul>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
                Keep monitoring your nodes for optimal performance!
            </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
            <strong>ZePatrol Monitoring Team</strong><br>
            Your trusted partner in node monitoring and optimization.
        </div>
    </div>
</body>
</html>
  `.trim();
};

/**
 * Generate telegram version of daily summary
 */
const generateSummaryTelegram = (summary, userName) => {
  const statusEmoji = summary.activeNodes === summary.totalNodes ? '🟢' : '🟡';
  const alertEmoji = summary.totalAlerts > 0 ? '⚠️' : '✅';

  let message = `
📊 *Daily Node Summary - ${summary.date}*

Dear ${userName || 'User'},

*Overview:*
${statusEmoji} Active Nodes: *${summary.activeNodes}/${summary.totalNodes}*
${alertEmoji} Total Alerts (24h): *${summary.totalAlerts}*

*Node Details:*
`;

     summary.nodeSummaries.forEach(node => {
     const nodeStatus = node.status === 'online' ? '🟢' : '🔴';
     const scoreStatus = node.scoreChange === 'increasing' ? '📈' : node.scoreChange === 'decreasing' ? '📉' : '➡️';
     const rewardStatus = node.rewardChange === 'increasing' ? '💰' : node.rewardChange === 'decreasing' ? '📉' : '➡️';
     
     let scoreText = `${scoreStatus} \`${node.currentScore || 'N/A'}\``;
     if (node.scoreChangeAmount !== undefined) {
       const changeText = node.scoreChangeAmount > 0 ? ` (+${node.scoreChangeAmount.toFixed(1)})` : ` (${node.scoreChangeAmount.toFixed(1)})`;
       scoreText += changeText;
     }
     
     let rewardText = `${rewardStatus} \`${node.currentReward || 'N/A'}\``;
     if (node.rewardChangeAmount !== undefined) {
       const changeText = node.rewardChangeAmount > 0 ? ` (+${node.rewardChangeAmount.toFixed(1)})` : ` (${node.rewardChangeAmount.toFixed(1)})`;
       rewardText += changeText;
     }
     
     message += `
 ${nodeStatus} *${node.name}* (${node.project})
 • Status: \`${node.status}\`
 • Uptime: \`${node.uptime.toFixed(1)}%\`
 • Alerts: \`${node.alerts24h}\`
 • Score: ${scoreText}
 • Reward: ${rewardText}
 `;
   });

  message += `

💡 *Performance Insights:*
• 📈 Increasing scores = Good performance
• 💰 Increasing rewards = Effective earning
• ⚠️ High alerts = Needs attention
• 🟢 All online = Optimal participation

Keep monitoring for optimal performance!

*ZePatrol Monitoring Team*
  `.trim();

  return message;
}; 