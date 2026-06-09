const validate = (schema) => (req, res, next) => {
    if (!req.body) {
        return res.status(400).json({ error: 'Request body is missing' });
    }
    
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const details = (result.error.issues || []).map(err => ({
            field: err.path.join('.'),
            message: err.message
        }));
        return res.status(400).json({
            error: 'Validation failed',
            details
        });
    }
    
    // Replace req.body with the sanitized/parsed data from Zod
    req.body = result.data;
    next();
};

module.exports = validate;
