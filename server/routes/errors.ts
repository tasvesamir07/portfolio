import type { Request, Response } from 'express';
const logger = require('../utils/logger');
const express = require('express');
const router = express.Router();

router.post('/log', (req: Request, res: Response) => {
    const { message, stack, url, userAgent, componentStack } = req.body || {};

    const reqId = (req as any).id || 'N/A';
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

    logger.error({
        clientMessage: message,
        clientStack: stack,
        clientUrl: url,
        clientUserAgent: userAgent,
        clientComponentStack: componentStack,
        reqId,
        clientIp,
        timestamp: new Date().toISOString()
    }, '[Client-Error]');

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
                        { name: 'Request ID', value: String(reqId).slice(0, 1024) },
                        { name: 'Client IP', value: String(clientIp).slice(0, 1024) },
                        { name: 'User Agent', value: String(userAgent || 'Unknown').slice(0, 1024) },
                        { name: 'Stack', value: `\`\`\`js\n${String(stack || 'No stack').slice(0, 1000)}\n\`\`\`` }
                    ],
                    timestamp: new Date().toISOString()
                }]
            })
        }).catch((err: Error) => logger.error({ err }, '[Error-Webhook] Failed to send client error to webhook'));
    }

    res.json({ success: true });
});

export = router;
