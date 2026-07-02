import type { Request } from 'express';
import logger = require('./logger');
const db = require('../db') as typeof import('../db');

export const logAuditActivity = async (req: Request, action: string, targetId: string | number | null = null, details: object | string | null = null) => {
    try {
        const adminId = (req as any).user?.id || null;
        const username = (req as any).user?.username || 'unknown';
        const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
        
        let detailsString: string | null = null;
        if (details) {
            detailsString = typeof details === 'object' ? JSON.stringify(details) : details;
        }

        await db.query(
            'INSERT INTO audit_logs (admin_id, username, action, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminId, username, action, targetId ? String(targetId) : null, detailsString, ipAddress]
        );
        logger.info({ username, action, targetId }, '[Audit-Log] Activity logged successfully');
    } catch (err: unknown) {
        logger.error({ err }, '[Audit-Log-Failed]');
    }
};
