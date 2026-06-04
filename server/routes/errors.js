const express = require('express');
const router = express.Router();

router.post('/log', (req, res) => {
    const { message, stack, url, userAgent, componentStack } = req.body || {};
    
    console.error('[Client-Error]', {
        message,
        stack,
        url,
        userAgent,
        componentStack,
        timestamp: new Date().toISOString()
    });

    const webhookUrl = process.env.ERROR_WEBHOOK_URL;
    if (webhookUrl) {
        fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                embeds: [{
                    title: '🚨 Client-Side Error Detected',
                    color: 16711680,
                    fields: [
                        { name: 'Message', value: String(message || 'No message').slice(0, 1024) },
                        { name: 'URL', value: String(url || 'Unknown').slice(0, 1024) },
                        { name: 'User Agent', value: String(userAgent || 'Unknown').slice(0, 1024) },
                        { name: 'Stack', value: `\`\`\`js\n${String(stack || 'No stack').slice(0, 1000)}\n\`\`\`` }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        }).catch(err => console.error('[Error-Webhook] Failed to send client error to webhook:', err.message));
    }

    res.json({ success: true });
});

module.exports = router;
