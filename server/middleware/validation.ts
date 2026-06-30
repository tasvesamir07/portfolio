import type { Request, Response, NextFunction } from 'express';

const validate = (schema: { safeParse: (data: unknown) => { success: boolean; data?: unknown; error?: { issues: Array<{ path: (string | number)[]; message: string }> } } }) =>
    (req: Request, res: Response, next: NextFunction): void => {
        if (!req.body) {
            res.status(400).json({ error: 'Request body is missing' });
            return;
        }

        const result = schema.safeParse(req.body);
        if (!result.success) {
            const details = (result.error?.issues || []).map(err => ({
                field: err.path.join('.'),
                message: err.message
            }));
            res.status(400).json({
                error: 'Validation failed',
                details
            });
            return;
        }

        req.body = result.data;
        next();
    };

export = validate;
