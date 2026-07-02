import type { Response } from 'express';

export const errorResponse = (res: Response, status: number, message: string, details?: unknown) => {
    const body: Record<string, unknown> = {
        error: message,
    };
    if (details) {
        body.details = details instanceof Error ? details.message : String(details);
        if (details instanceof Error && details.stack) {
            body.stack = details.stack;
        }
    }
    return res.status(status).json(body);
};
