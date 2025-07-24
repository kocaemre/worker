import { sendEmail } from './email.adapter.js';

/**
 * Send alert for failed node.
 */
export const sendAlert = async ({ node, result, logger, prisma }) => {
  const projectName = node.blockchainProject.displayName || node.blockchainProject.name;
  const category = node.blockchainProject.category;
  const currentTime = new Date().toLocaleString('en-US', { 
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Check alert type
  let isGensynScoreAlert = false;
  if (category === 'genysn' && result && result.error) {
    if (result.error.includes('Score not increasing')) isGensynScoreAlert = true;
  }

  logger.warn({ nodeId: node.id }, 'Sending alert');

  // Send email to notification email or regular email
  const emailTo = node.user.notificationEmail || node.user.email;
  
  if (emailTo) {
    try {
      let subject, textBody, htmlBody;
      
      // Genysn specific score alert
      if (isGensynScoreAlert) {
        subject = `${projectName} Alert: Score Not Increasing - ${node.name}`;
        textBody = `
Dear ${node.user.name || 'User'},

We detected an issue with your ${projectName} node that requires your attention.

ALERT DETAILS:
• Node Name: ${node.name}
• Blockchain: ${projectName}
• Issue: Score not increasing
• Consecutive Failed Checks: 3
• Alert Time: ${currentTime}

ISSUE DESCRIPTION:
Your node has not increased its score for the last 3 consecutive monitoring checks. This could indicate:
• Node performance degradation
• Network participation issues
• Validation problems
• Connection instability

RECOMMENDED ACTIONS:
1. Check your node performance metrics
2. Verify network participation
3. Review validation processes
4. Check connection stability
5. Monitor system performance

This alert was sent to: ${emailTo}

If you believe this is a false alarm, please check your node status manually.

Best regards,
ZePatrol Monitoring Team

Need help? Contact our support team or check our documentation.
        `.trim();

        htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Node Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f9f9f9;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 0; border: 1px solid #ddd;">
        
        <div style="background-color: #ff6b35; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px; font-weight: normal;">${projectName} Node Alert</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Score Not Increasing</p>
        </div>
        
        <div style="padding: 30px;">
            <p>Dear <strong>${node.user.name || 'User'}</strong>,</p>
            
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
                <strong>Your ${projectName} node "${node.name}" requires attention!</strong><br>
                Score has not increased for 3 consecutive monitoring checks.
            </div>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background: #f8f9fa; border-radius: 8px;">
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #6c757d;">Node Name:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;"><strong>${node.name}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #6c757d;">Blockchain:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${projectName}</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #6c757d;">Issue:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; color: #dc3545;">Score not increasing</td>
                </tr>
                <tr>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #6c757d;">Failed Checks:</td>
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">3 consecutive</td>
                </tr>
                <tr>
                    <td style="padding: 12px; font-weight: bold; color: #6c757d;">Alert Time:</td>
                    <td style="padding: 12px;">${currentTime}</td>
                </tr>
            </table>
            
            <h3 style="color: #dc3545; margin-top: 30px;">What This Means</h3>
            <p>Your node has not increased its score for the last 3 consecutive monitoring checks. This could indicate:</p>
            <ul style="padding-left: 20px;">
                <li>Node performance degradation</li>
                <li>Network participation issues</li>
                <li>Validation problems</li>
                <li>Connection instability</li>
            </ul>
            
            <div style="background: #e7f3ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #0066cc;">Recommended Actions</h3>
                <ol style="margin: 10px 0; padding-left: 20px;">
                    <li>Check your node performance metrics</li>
                    <li>Verify network participation</li>
                    <li>Review validation processes</li>
                    <li>Check connection stability</li>
                    <li>Monitor system performance</li>
                </ol>
            </div>
            
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d;">
                This alert was sent to: <strong>${emailTo}</strong><br>
                If you believe this is a false alarm, please check your node status manually.
            </p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6; color: #6c757d; font-size: 14px; border-radius: 0 0 8px 8px;">
            <strong>ZePatrol Monitoring Team</strong><br>
            Need help? Contact our support team or check our documentation.
        </div>
    </div>
</body>
</html>
        `.trim();
      } 
      // Generic downtime alert for all categories
      else {
        subject = `⚠️ Node "${node.name}" Alert`;
        textBody = `
Dear ${node.user.name || 'User'},

Your ${projectName} node "${node.name}" requires attention.

Issue: ${result.error ?? 'Health check failed'}
Time: ${currentTime}

Please check your node status and take necessary actions.

Best regards,
ZePatrol Monitoring Team
        `.trim();

        // Simple HTML for generic alerts
        htmlBody = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Node Alert</title>
</head>
<body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9f9f9;">
    <div style="max-width: 500px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; border: 1px solid #ddd;">
        <h2 style="color: #dc3545; margin-top: 0;">Node Alert</h2>
        <p>Dear <strong>${node.user.name || 'User'}</strong>,</p>
        <p>Your <strong>${projectName}</strong> node "<strong>${node.name}</strong>" requires attention.</p>
        <div style="background: #f8d7da; padding: 15px; margin: 20px 0; border-radius: 4px; color: #721c24;">
            <strong>Issue:</strong> ${result.error ?? 'Health check failed'}<br>
            <strong>Time:</strong> ${currentTime}
        </div>
        <p>Please check your node status and take necessary actions.</p>
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        <p style="font-size: 14px; color: #6c757d;">
            Best regards,<br>
            <strong>ZePatrol Monitoring Team</strong>
        </p>
    </div>
</body>
</html>
        `.trim();
      }

      await sendEmail(emailTo, subject, textBody, htmlBody);
      logger.info({ nodeId: node.id, emailTo }, 'Email alert sent successfully');
      
      // Mark alerts as sent only if email was successful
      await prisma.alert.updateMany({
        where: {
          nodeId: node.id,
          isSent: false,
          type: 'downtime'
        },
        data: { isSent: true }
      });
    } catch (error) {
      logger.error({ nodeId: node.id, emailTo, error: error.message }, 'Failed to send email alert');
    }
  }

  // Send Telegram for premium users (independent of email success/failure)
  if (node.user.subscriptionStatus === 'premium' && node.user.telegramChatId) {
    try {
      const { sendTelegram } = await import('./telegram.adapter.js');
      let telegramMessage;
      
      // Genysn specific telegram message
      if (isGensynScoreAlert) {
        telegramMessage = `
*${projectName} Alert*

*Node:* \`${node.name}\`
*Issue:* Score Not Increasing
*Failed Checks:* 3 consecutive
*Time:* ${currentTime}

Your node hasn't increased its score for 3 consecutive monitoring checks.

*Possible Causes:*
• Performance degradation
• Network participation issues
• Validation problems

*Actions:*
✅ Check performance metrics
✅ Verify network participation
✅ Review validation process
✅ Monitor connection stability

💡 _Check your node's participation in network activities_
        `.trim();
      } 
      // Generic telegram message for other categories
      else {
        telegramMessage = `
⚠️ *Node Alert*

*Node:* \`${node.name}\`
*Project:* ${projectName}
*Issue:* ${result.error ?? 'Health check failed'}
*Time:* ${currentTime}

Please check your node status and take necessary actions.
        `.trim();
      }

      await sendTelegram(node.user.telegramChatId, telegramMessage);
      logger.info({ nodeId: node.id, chatId: node.user.telegramChatId }, 'Telegram alert sent successfully');
    } catch (error) {
      logger.error({ nodeId: node.id, chatId: node.user.telegramChatId, error: error.message }, 'Failed to send Telegram alert');
    }
  }
}; 