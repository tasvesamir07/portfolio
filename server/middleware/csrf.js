const crypto = require('crypto');

const parseCookies = (cookieHeader) => {
    const cookies = {};
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

const csrfMiddleware = (req, res, next) => {
    // 1. Get or generate CSRF token
    const cookies = parseCookies(req.headers.cookie);
    let token = cookies['XSRF-TOKEN'];

    if (!token) {
        token = crypto.randomBytes(24).toString('hex');
        // Set the token in a cookie that is readable by client-side JS (Axios)
        res.cookie('XSRF-TOKEN', token, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            httpOnly: false // Must be accessible to client JS (Axios) to read and set header
        });
    }

    // 2. Validate mutating requests
    const method = String(req.method || 'GET').toUpperCase();
    const isMutating = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    if (isMutating) {
        // Exempt public submission and webhooks endpoints
        const exemptedPaths = [
            '/api/messages',
            '/api/anonymous-messages',
            '/api/translate',
            '/api/errors',
            '/api/ping',
            '/api/health'
        ];

        const isExempted = exemptedPaths.some(p => req.path.startsWith(p));
        if (!isExempted) {
            const clientHeaderToken = req.headers['x-xsrf-token'];
            if (!clientHeaderToken || clientHeaderToken !== token) {
                console.warn(`[CSRF Warning] Token mismatch or missing. IP: ${req.ip}, Path: ${req.path}`);
                return res.status(403).json({ error: 'CSRF validation failed. Token mismatch or expired.' });
            }
        }
    }

    next();
};

module.exports = csrfMiddleware;
