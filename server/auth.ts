import type { Request, Response, NextFunction } from 'express';

const jwt = require('jsonwebtoken');
if (process.env.NODE_ENV !== 'production' && !process.env.CF_PAGES) {
    require('dotenv').config();
}
const { logAuditActivity } = require('./utils/audit');

const authenticateToken = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && (authHeader as string).split(' ')[1];

    if (!token) {
        res.sendStatus(401);
        return;
    }

    jwt.verify(token, process.env.JWT_SECRET, (err: any, user: any) => {
        if (err) {
            console.error('JWT Verification Error:', err.name, err.message);
            res.status(403).json({
                error: 'Forbidden',
                message: err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.'
            });
            return;
        }
        (req as any).user = user;

        if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
            const originalJson = res.json.bind(res) as (body: any) => Response;
            const originalSendStatus = res.sendStatus.bind(res) as (code: number) => Response;
            const originalSend = res.send.bind(res) as (body: any) => Response;

            let logged = false;
            const logMutation = (payload: any, status: number) => {
                if (logged) return;
                if (status >= 200 && status < 300) {
                    logged = true;
                    const urlPath = req.originalUrl || req.path || '';
                    const parts = urlPath.split('/').filter(Boolean);

                    const moduleName = parts[1] || 'unknown';
                    const targetId = (req as any).params?.id || payload?.id || parts[2] || null;
                    const action = `${req.method}_${moduleName.toUpperCase()}`;

                    let details: any = null;
                    if (req.body && !urlPath.includes('profile') && !urlPath.includes('login')) {
                        const bodyCopy = { ...req.body };
                        delete bodyCopy.password;
                        delete bodyCopy.password_hash;
                        delete bodyCopy.image_url;
                        delete bodyCopy.thumbnail_url;
                        delete bodyCopy.file_url;
                        delete bodyCopy.logo_url;
                        delete bodyCopy.content;
                        details = bodyCopy;
                    }

                    try {
                        logAuditActivity(req, action, targetId, details);
                    } catch (auditError: any) {
                        console.error('Failed to log audit activity:', auditError.message);
                    }
                }
            };

            (res as any).json = (payload: any) => {
                logMutation(payload, res.statusCode || 200);
                return originalJson(payload);
            };

            (res as any).send = (payload: any) => {
                logMutation(null, res.statusCode || 200);
                return originalSend(payload);
            };

            (res as any).sendStatus = (statusCode: number) => {
                logMutation(null, statusCode);
                return originalSendStatus(statusCode);
            };
        }

        next();
    });
};

export = authenticateToken;
