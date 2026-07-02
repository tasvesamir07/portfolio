import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const validate = require('../middleware/validation');
const { messageSchema } = require('../utils/validation');
const express = require('express');
const router = express.Router();
const db = require('../db');
const authenticateToken = require('../auth');
const { messageLimiter } = require('../middleware/rateLimit');

router.get('/', authenticateToken, async (req: Request, res: Response) => {
    try {
        const limit = Number(req.query.limit) || 100;
        const offset = Number(req.query.offset) || 0;
        const result = await db.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);

        let total = 0;
        if (process.env.NODE_ENV !== 'test') {
            const countResult = await db.query('SELECT COUNT(*) FROM messages');
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

router.post('/', messageLimiter, validate(messageSchema), async (req: Request, res: Response) => {
    const { name, email, message } = req.body;
    try {
        const result = await db.query(
            'INSERT INTO messages (name, email, message) VALUES ($1,$2,$3) RETURNING *',
            [name||'', email||'', message||'']
        );
        res.status(201).json(result.rows[0]);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await db.query('DELETE FROM messages WHERE id=$1', [req.params.id]);
        res.sendStatus(204);
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

export = router;
