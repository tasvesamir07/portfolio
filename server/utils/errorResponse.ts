import type { Response } from 'express';

export const errorResponse = (res: Response, status: number, message: string, details?: unknown) => {
    const body: Record<string, unknown> = {
        error: message,
    };
    if (process.env.NODE_ENV !== 'production' && details) {
        body.details = details instanceof Error ? details.message : String(details);
    }
    return res.status(status).json(body);
};
