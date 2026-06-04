const db = require('../db');

const logAuditActivity = async (req, action, targetId = null, details = null) => {
    try {
        const adminId = req.user?.id || null;
        const username = req.user?.username || 'unknown';
        const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
        
        let detailsString = details;
        if (details && typeof details === 'object') {
            detailsString = JSON.stringify(details);
        }

        await db.query(
            'INSERT INTO audit_logs (admin_id, username, action, target_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
            [adminId, username, action, targetId ? String(targetId) : null, detailsString, ipAddress]
        );
        console.log(`[Audit-Log] Admin "${username}" executed action "${action}" on target ID "${targetId || 'N/A'}"`);
    } catch (err) {
        console.error('[Audit-Log-Failed]', err.message);
    }
};

module.exports = {
    logAuditActivity
};
