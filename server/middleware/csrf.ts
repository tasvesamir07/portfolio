import crypto = require('crypto');
import type { Request, Response, NextFunction } from 'express';

const parseCookies = (cookieHeader: string | undefined): Record<string, string> => {
    const cookies: Record<string, string> = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        if (parts.length >= 2) {
            const name = parts[0].trim();
            const value = parts.slice(1).join('=').trim();
            cookies[name] = value;
        }
    });
    return cookies;
};

const csrfMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.NODE_ENV === 'test') {
        next();
        return;
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        next();
        return;
    }

    const cookies = parseCookies(req.headers.cookie as string | undefined);
    let token = cookies['XSRF-TOKEN'];

    if (!token) {
        token = crypto.randomBytes(24).toString('hex');
        res.cookie('XSRF-TOKEN', token, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false
        });
    }

    const method = String(req.method || 'GET').toUpperCase();
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    if (isMutating) {
        const exemptedPaths = [
            '/api/messages',
            '/api/v1/messages',
            '/api/anonymous-messages',
            '/api/v1/anonymous-messages',
            '/api/translate',
            '/api/v1/translate',
            '/api/errors',
            '/api/v1/errors',
            '/api/ping',
            '/api/v1/ping',
            '/api/health',
            '/api/v1/health',
            '/api/v1/admin-login',
            '/api/v1/forgot-password',
            '/api/v1/webhooks'
        ];

        const isExempted = exemptedPaths.some(p => (req.path || '').startsWith(p));
        if (!isExempted) {
            const clientHeaderToken = req.headers['x-xsrf-token'];
            if (!clientHeaderToken || clientHeaderToken !== token) {
                console.warn(`[CSRF Warning] Token mismatch or missing. IP: ${req.ip}, Path: ${req.path}`);
                res.status(403).json({ error: 'CSRF validation failed. Token mismatch or expired.' });
                return;
            }
        }
    }

    next();
};

export = csrfMiddleware;
