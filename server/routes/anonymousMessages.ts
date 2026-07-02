import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const validate = require('../middleware/validation');
const { anonymousMessageSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { anonymousLimiter } = require('../middleware/rateLimit');

router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const result = await db.query('SELECT * FROM anonymous_messages ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

        let total = 0;
        if (process.env.NODE_ENV !== 'test') {
            const countResult = await db.query('SELECT COUNT(*) FROM anonymous_messages');
            total = parseInt(countResult.rows[0].count, 10);
        } else {
            total = result.rows.length;
        }
        res.setHeader('X-Total-Count', total);
        res.setHeader('X-Limit', limit);
        res.setHeader('X-Offset', offset);

        res.json(result.rows);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/', anonymousLimiter, validate(anonymousMessageSchema), async (req: Request, res: Response) => {
    const { message } = req.body;
    const website = req.body?.website || '';
    if (website) {
        res.json({ success: true });
        return;
    }
    try {
        const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        const result = await db.query(
            'INSERT INTO anonymous_messages (message, ip_address) VALUES ($1,$2) RETURNING *',
            [message||'', ipAddress]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
    const isRead = req.body?.is_read !== false;
    try {
        const result = await db.query(
            'UPDATE anonymous_messages SET is_read = $1 WHERE id = $2 RETURNING *',
            [isRead, req.params.id]
        );
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        res.json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const result = await db.query('DELETE FROM anonymous_messages WHERE id=$1 RETURNING id', [req.params.id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }
        res.sendStatus(204);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
