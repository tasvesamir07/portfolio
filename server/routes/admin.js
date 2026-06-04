const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const db = require('../db');
const authenticateToken = require('../auth');
const { upload, processFile, MAX_UPLOAD_SIZE_MB } = require('../upload');
const { loginLimiter } = require('../middleware/rateLimit');

const OTP_TTL_MINUTES = 5;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

let otpMailer;

const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizeUsername = (value = '') => String(value || '').trim();
const normalizeIdentifier = (value = '') => String(value || '').trim();

const createOtpHash = (otp = '') => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return crypto
        .createHmac('sha256', secret)
        .update(String(otp))
        .digest('hex');
};

const generateOtpCode = () => String(Math.floor(100000 + Math.random() * 900000));

const sanitizeUser = (user = {}) => ({
    id: user.id,
    username: user.username || '',
    email: user.email || ''
});

const buildAuthToken = (user = {}) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required');
    }
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email || ''
        },
        secret,
        { expiresIn: '1h' }
    );
};

const getOtpMailer = () => {
    if (otpMailer) return otpMailer;

    const service = process.env.PURCHASE_EMAIL_SERVICE || 'gmail';
    const user = process.env.PURCHASE_EMAIL_USER;
    const pass = process.env.PURCHASE_EMAIL_PASS;

    if (!user || !pass) {
        throw new Error('OTP email sender is not configured. Set PURCHASE_EMAIL_USER and PURCHASE_EMAIL_PASS.');
    }

    otpMailer = nodemailer.createTransport({
        service,
        auth: { user, pass }
    });

    return otpMailer;
};

const sendOtpEmail = async ({ to, username, otp, subject, title, body }) => {
    console.log('[Email] Preparing to send OTP...');
    try {
        const transporter = getOtpMailer();
        const sender = process.env.PURCHASE_EMAIL_USER;

        const defaultSubject = 'Your Admin Profile OTP Code';
        const defaultTitle = 'Admin Profile Verification';
        const defaultBody = 'Use this OTP to confirm your request:';

        await transporter.sendMail({
            from: sender,
            to,
            subject: subject || defaultSubject,
            text: `Hello ${username || 'Admin'}, your OTP code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. If you request a new code, the previous one stops working immediately.`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
                    <h2 style="margin: 0 0 12px;">${title || defaultTitle}</h2>
                    <p style="margin: 0 0 12px;">Hello ${username || 'Admin'},</p>
                    <p style="margin: 0 0 12px;">${body || defaultBody}</p>
                    <div style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b3b75; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 6px;">
                        ${otp}
                    </div>
                    <p style="margin: 16px 0 0;">This code expires in ${OTP_TTL_MINUTES} minutes. If you request a new code, the previous code stops working immediately.</p>
                </div>
            `
        });
        console.log(`[Email] Success`);
    } catch (err) {
        console.error('[Email] Failed to send OTP:', err);
        throw err;
    }
};

const getUserById = async (id) => {
    const result = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] || null;
};

const clearPendingProfileUpdate = async (userId) => {
    await db.query(
        `UPDATE users
         SET otp_hash = NULL,
             otp_expires_at = NULL,
             pending_username = NULL,
             pending_email = NULL,
             pending_password_hash = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [userId]
    );
};

// --- Authentication / Session endpoints ---
router.post('/admin-login', loginLimiter, async (req, res) => {
    const identifier = normalizeIdentifier(req.body?.identifier || req.body?.username || req.body?.email);
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
        return res.status(400).json({ message: 'Username or email and password are required.' });
    }

    try {
        const result = await db.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(COALESCE(email, \'\')) = LOWER($1) LIMIT 1',
            [identifier]
        );
        if (result.rows.length === 0) return res.status(401).json({ message: 'Invalid credentials' });

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (isMatch) {
            const token = buildAuthToken(user);
            res.json({
                token,
                user: sanitizeUser(user)
            });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/forgot-password', loginLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email || '');
    if (!email || !EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Enter a valid email address.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'No admin account found with that email.' });
        }

        const user = result.rows[0];
        const otp = generateOtpCode();
        const otpHash = createOtpHash(otp);

        await db.query(
            `UPDATE users
             SET otp_hash = $1,
                 otp_expires_at = NOW() + INTERVAL '5 minutes',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [otpHash, user.id]
        );

        await sendOtpEmail({
            to: email,
            username: user.username,
            otp,
            subject: 'Password Reset OTP Code',
            title: 'Password Reset Verification',
            body: 'Use this OTP to verify your password reset request:'
        });

        res.json({ message: `A 6-digit OTP was sent to ${email}.` });
    } catch (err) {
        console.error('Forgot Password Error:', err);
        res.status(500).json({ message: 'Failed to send OTP.' });
    }
});

router.post('/reset-password', loginLimiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email || '');
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Email, OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found.' });

        const user = result.rows[0];

        if (!user.otp_hash || !user.otp_expires_at) {
            return res.status(400).json({ message: 'No pending reset request found.' });
        }

        if (new Date(user.otp_expires_at).getTime() < Date.now()) {
            return res.status(400).json({ message: 'OTP expired. Please request a new one.' });
        }

        if (createOtpHash(otp) !== user.otp_hash) {
            return res.status(400).json({ message: 'Invalid OTP.' });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        await db.query(
            `UPDATE users
             SET password_hash = $1,
                 otp_hash = NULL,
                 otp_expires_at = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [newPasswordHash, user.id]
        );

        res.json({ message: 'Password reset successfully. You can now log in.' });
    } catch (err) {
        console.error('Reset Password Error:', err);
        res.status(500).json({ message: 'Failed to reset password.' });
    }
});

router.get('/session', authenticateToken, (req, res) => {
    res.json({
        authenticated: true,
        user: {
            id: req.user?.id,
            username: req.user?.username,
            email: req.user?.email || ''
        }
    });
});

router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }
        res.json(sanitizeUser(user));
    } catch (err) {
        res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
    }
});

router.post('/profile-otp', authenticateToken, loginLimiter, async (req, res) => {
    try {
        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        const nextUsername = normalizeUsername(req.body?.username || user.username);
        const nextEmail = normalizeEmail(req.body?.email || '');
        const nextPassword = String(req.body?.password || '');

        if (!nextUsername) {
            return res.status(400).json({ message: 'Username is required.' });
        }

        if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
            return res.status(400).json({ message: 'Enter a valid email address.' });
        }

        if (nextPassword && nextPassword.length < 6) {
            return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }

        const normalizedCurrentEmail = normalizeEmail(user.email || '');
        const hasUsernameChange = nextUsername !== user.username;
        const hasEmailChange = nextEmail !== normalizedCurrentEmail;
        const hasPasswordChange = Boolean(nextPassword);

        if (!hasUsernameChange && !hasEmailChange && !hasPasswordChange) {
            return res.status(400).json({ message: 'Change at least one field before requesting an OTP.' });
        }

        const usernameConflict = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
            [nextUsername, user.id]
        );
        if (usernameConflict.rows.length) {
            return res.status(409).json({ message: 'That username is already in use.' });
        }

        if (nextEmail) {
            const emailConflict = await db.query(
                'SELECT id FROM users WHERE LOWER(COALESCE(email, \'\')) = LOWER($1) AND id <> $2 LIMIT 1',
                [nextEmail, user.id]
            );
            if (emailConflict.rows.length) {
                return res.status(409).json({ message: 'That email is already in use.' });
            }
        }

        const recipientEmail = normalizedCurrentEmail || nextEmail;
        if (!recipientEmail) {
            return res.status(400).json({ message: 'Set an email address before requesting an OTP.' });
        }

        const otp = generateOtpCode();
        const otpHash = createOtpHash(otp);
        const pendingPasswordHash = nextPassword ? await bcrypt.hash(nextPassword, 10) : null;

        await db.query(
            `UPDATE users
             SET otp_hash = $1,
                 otp_expires_at = NOW() + INTERVAL '5 minutes',
                 pending_username = $2,
                 pending_email = $3,
                 pending_password_hash = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [otpHash, nextUsername, nextEmail, pendingPasswordHash, user.id]
        );

        await sendOtpEmail({
            to: recipientEmail,
            username: user.username,
            otp
        });

        res.json({
            message: `A 6-digit OTP was sent to ${recipientEmail}. It expires in ${OTP_TTL_MINUTES} minutes.`,
            recipientEmail
        });
    } catch (err) {
        console.error('Profile OTP request failed:', err);
        res.status(500).json({ message: 'Failed to send OTP email. Please try again.' });
    }
});

router.post('/profile-confirm', authenticateToken, async (req, res) => {
    try {
        const otp = String(req.body?.otp || '').trim();
        if (!/^\d{6}$/.test(otp)) {
            return res.status(400).json({ message: 'Enter a valid 6-digit OTP.' });
        }

        const user = await getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'User account not found.' });
        }

        if (!user.otp_hash || !user.otp_expires_at) {
            return res.status(400).json({ message: 'No pending OTP request found. Request a new OTP first.' });
        }

        if (new Date(user.otp_expires_at).getTime() < Date.now()) {
            await clearPendingProfileUpdate(user.id);
            return res.status(400).json({ message: 'OTP expired. Request a new one.' });
        }

        if (createOtpHash(otp) !== user.otp_hash) {
            return res.status(400).json({ message: 'Invalid OTP. Request a new code if needed.' });
        }

        const nextUsername = normalizeUsername(user.pending_username || user.username);
        const nextEmail = normalizeEmail(user.pending_email || '');
        const nextPasswordHash = user.pending_password_hash || user.password_hash;

        const usernameConflict = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
            [nextUsername, user.id]
        );
        if (usernameConflict.rows.length) {
            return res.status(409).json({ message: 'That username is already in use.' });
        }

        if (nextEmail) {
            const emailConflict = await db.query(
                'SELECT id FROM users WHERE LOWER(COALESCE(email, \'\')) = LOWER($1) AND id <> $2 LIMIT 1',
                [nextEmail, user.id]
            );
            if (emailConflict.rows.length) {
                return res.status(409).json({ message: 'That email is already in use.' });
            }
        }

        const updateResult = await db.query(
            `UPDATE users
             SET username = $1,
                 email = $2,
                 password_hash = $3,
                 otp_hash = NULL,
                 otp_expires_at = NULL,
                 pending_username = NULL,
                 pending_email = NULL,
                 pending_password_hash = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $4
             RETURNING *`,
            [nextUsername, nextEmail, nextPasswordHash, user.id]
        );

        const updatedUser = updateResult.rows[0];
        const token = buildAuthToken(updatedUser);

        res.json({
            message: 'Profile updated successfully.',
            token,
            user: sanitizeUser(updatedUser)
        });
    } catch (err) {
        console.error('Profile OTP confirm failed:', err);
        res.status(500).json({ message: 'Failed to update profile.' });
    }
});

// --- Upload Route ---
router.post('/upload', authenticateToken, (req, res) => {
    upload.single('file')(req, res, async (uploadErr) => {
        if (uploadErr) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(413).json({ error: `File is too large. Maximum upload size is ${MAX_UPLOAD_SIZE_MB} MB.` });
            }
            return res.status(400).json({ error: uploadErr.message || 'Upload failed.' });
        }

        try {
            if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
            const filePath = await processFile(req.file);
            const fullUrl = filePath.startsWith('http') ? filePath : `${req.protocol}://${req.get('host')}${filePath}`;
            res.json({ url: fullUrl });
        } catch (err) {
            res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message });
        }
    });
});

module.exports = router;
