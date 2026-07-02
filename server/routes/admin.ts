import type { Request, Response } from 'express';
const { errorResponse } = require('../utils/errorResponse');
const logger = require('../utils/logger');
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
const validate = require('../middleware/validation');
const {
    adminLoginSchema,
    forgotPasswordSchema,
    resetPasswordSchema,
    profileOtpSchema,
    profileConfirmSchema
} = require('../utils/validation');
const { isFeatureEnabled } = require('../utils/featureFlags');

const OTP_TTL_MINUTES = 5;
const EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

let otpMailer: any = null;

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

const sanitizeUser = (user: any) => ({
    id: user.id,
    username: user.username || '',
    email: user.email || ''
});

const buildAuthToken = (user: any) => {
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

    const user = process.env.PURCHASE_EMAIL_USER;
    const pass = process.env.PURCHASE_EMAIL_PASS;

    if (!user || !pass) {
        throw new Error('OTP email sender is not configured. Set PURCHASE_EMAIL_USER and PURCHASE_EMAIL_PASS.');
    }

    otpMailer = nodemailer.createTransport({
        service: process.env.PURCHASE_EMAIL_SERVICE || 'gmail',
        auth: { user, pass }
    });

    return otpMailer;
};

const sendOtpEmail = async ({ to, username, otp, subject, title, body }: any) => {
    logger.info('[Email] Preparing to send OTP...');
    try {
        const transporter = getOtpMailer();
        const sender = process.env.PURCHASE_EMAIL_USER;

        await transporter.sendMail({
            from: sender,
            to,
            subject: subject || 'Your Admin Profile OTP Code',
            text: `Hello ${username || 'Admin'}, your OTP code is ${otp}. It expires in ${OTP_TTL_MINUTES} minutes. If you request a new code, the previous one stops working immediately.`,
            html: `
                <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6;">
                    <h2 style="margin: 0 0 12px;">${title || 'Admin Profile Verification'}</h2>
                    <p style="margin: 0 0 12px;">Hello ${username || 'Admin'},</p>
                    <p style="margin: 0 0 12px;">${body || 'Use this OTP to confirm your request:'}</p>
                    <div style="display: inline-block; padding: 12px 18px; border-radius: 10px; background: #0b3b75; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 6px;">
                        ${otp}
                    </div>
                    <p style="margin: 16px 0 0;">This code expires in ${OTP_TTL_MINUTES} minutes. If you request a new code, the previous code stops working immediately.</p>
                </div>
            `
        });
        logger.info('[Email] Success');
    } catch (err: unknown) {
        logger.error({ err: err }, '[Email] Failed to send OTP:', String(err));
        throw err;
    }
};

const getUserById = async (id: number) => {
    const result = await db.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
    return result.rows[0] || null;
};

const clearPendingProfileUpdate = async (userId: number) => {
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

router.post('/admin-login', loginLimiter, validate(adminLoginSchema), async (req: Request, res: Response) => {
    const identifier = normalizeIdentifier(req.body?.identifier || req.body?.username || req.body?.email);
    const password = String(req.body?.password || '');

    if (!identifier || !password) {
        res.status(400).json({ message: 'Username or email and password are required.' });
        return;
    }

    try {
        const result = await db.query(
            'SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(COALESCE(email, \'\')) = LOWER($1) LIMIT 1',
            [identifier]
        );
        if (result.rows.length === 0) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

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
    } catch (err: unknown) {
        logger.error({ err: err }, 'Login Error:', err);
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/forgot-password', loginLimiter, validate(forgotPasswordSchema), async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email || '');
    if (!email || !EMAIL_REGEX.test(email)) {
        res.status(400).json({ message: 'Enter a valid email address.' });
        return;
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'No admin account found with that email.' });
            return;
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
    } catch (err: unknown) {
        logger.error({ err: err }, 'Forgot Password Error:', err);
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/reset-password', loginLimiter, validate(resetPasswordSchema), async (req: Request, res: Response) => {
    const email = normalizeEmail(req.body?.email || '');
    const otp = String(req.body?.otp || '').trim();
    const newPassword = String(req.body?.newPassword || '');

    if (!email || !otp || !newPassword) {
        res.status(400).json({ message: 'Email, OTP, and new password are required.' });
        return;
    }

    if (newPassword.length < 6) {
        res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        return;
    }

    try {
        const result = await db.query('SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
        if (result.rows.length === 0) {
            res.status(404).json({ message: 'User not found.' });
            return;
        }

        const user = result.rows[0];

        if (!user.otp_hash || !user.otp_expires_at) {
            res.status(400).json({ message: 'No pending reset request found.' });
            return;
        }

        if (new Date(user.otp_expires_at).getTime() < Date.now()) {
            res.status(400).json({ message: 'OTP expired. Please request a new one.' });
            return;
        }

        if (createOtpHash(otp) !== user.otp_hash) {
            res.status(400).json({ message: 'Invalid OTP.' });
            return;
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
    } catch (err: unknown) {
        logger.error({ err: err }, 'Reset Password Error:', err);
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.get('/session', authenticateToken, (req: Request, res: Response) => {
    res.json({
        authenticated: true,
        user: {
            id: (req as any).user?.id,
            username: (req as any).user?.username,
            email: (req as any).user?.email || ''
        },
        features: {
            newEditor: isFeatureEnabled('newEditor')
        }
    });
});

router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
    try {
        const user = await getUserById((req as any).user.id);
        if (!user) {
            res.status(404).json({ message: 'User account not found.' });
            return;
        }
        res.json(sanitizeUser(user));
    } catch (err: unknown) {
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/profile-otp', authenticateToken, loginLimiter, validate(profileOtpSchema), async (req: Request, res: Response) => {
    try {
        const user = await getUserById((req as any).user.id);
        if (!user) {
            res.status(404).json({ message: 'User account not found.' });
            return;
        }

        const nextUsername = normalizeUsername(req.body?.username || user.username);
        const nextEmail = normalizeEmail(req.body?.email || '');
        const nextPassword = String(req.body?.password || '');

        if (!nextUsername) {
            res.status(400).json({ message: 'Username is required.' });
            return;
        }

        if (nextEmail && !EMAIL_REGEX.test(nextEmail)) {
            res.status(400).json({ message: 'Enter a valid email address.' });
            return;
        }

        if (nextPassword && nextPassword.length < 6) {
            res.status(400).json({ message: 'Password must be at least 6 characters long.' });
            return;
        }

        const normalizedCurrentEmail = normalizeEmail(user.email || '');
        const hasUsernameChange = nextUsername !== user.username;
        const hasEmailChange = nextEmail !== normalizedCurrentEmail;
        const hasPasswordChange = Boolean(nextPassword);

        if (!hasUsernameChange && !hasEmailChange && !hasPasswordChange) {
            res.status(400).json({ message: 'Change at least one field before requesting an OTP.' });
            return;
        }

        const usernameConflict = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
            [nextUsername, user.id]
        );
        if (usernameConflict.rows.length) {
            res.status(409).json({ message: 'That username is already in use.' });
            return;
        }

        if (nextEmail) {
            const emailConflict = await db.query(
                'SELECT id FROM users WHERE LOWER(COALESCE(email, \'\')) = LOWER($1) AND id <> $2 LIMIT 1',
                [nextEmail, user.id]
            );
            if (emailConflict.rows.length) {
                res.status(409).json({ message: 'That email is already in use.' });
                return;
            }
        }

        const recipientEmail = normalizedCurrentEmail || nextEmail;
        if (!recipientEmail) {
            res.status(400).json({ message: 'Set an email address before requesting an OTP.' });
            return;
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
    } catch (err: unknown) {
        logger.error({ err: err }, 'Profile OTP request failed:', err);
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/profile-confirm', authenticateToken, validate(profileConfirmSchema), async (req: Request, res: Response) => {
    try {
        const otp = String(req.body?.otp || '').trim();
        if (!/^\d{6}$/.test(otp)) {
            res.status(400).json({ message: 'Enter a valid 6-digit OTP.' });
            return;
        }

        const user = await getUserById((req as any).user.id);
        if (!user) {
            res.status(404).json({ message: 'User account not found.' });
            return;
        }

        if (!user.otp_hash || !user.otp_expires_at) {
            res.status(400).json({ message: 'No pending OTP request found. Request a new OTP first.' });
            return;
        }

        if (new Date(user.otp_expires_at).getTime() < Date.now()) {
            await clearPendingProfileUpdate(user.id);
            res.status(400).json({ message: 'OTP expired. Request a new one.' });
            return;
        }

        if (createOtpHash(otp) !== user.otp_hash) {
            res.status(400).json({ message: 'Invalid OTP. Request a new code if needed.' });
            return;
        }

        const nextUsername = normalizeUsername(user.pending_username || user.username);
        const nextEmail = normalizeEmail(user.pending_email || '');
        const nextPasswordHash = user.pending_password_hash || user.password_hash;

        const usernameConflict = await db.query(
            'SELECT id FROM users WHERE LOWER(username) = LOWER($1) AND id <> $2 LIMIT 1',
            [nextUsername, user.id]
        );
        if (usernameConflict.rows.length) {
            res.status(409).json({ message: 'That username is already in use.' });
            return;
        }

        if (nextEmail) {
            const emailConflict = await db.query(
                'SELECT id FROM users WHERE LOWER(COALESCE(email, \'\')) = LOWER($1) AND id <> $2 LIMIT 1',
                [nextEmail, user.id]
            );
            if (emailConflict.rows.length) {
                res.status(409).json({ message: 'That email is already in use.' });
                return;
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
    } catch (err: unknown) {
        logger.error({ err: err }, 'Profile OTP confirm failed:', err);
        errorResponse(res, 500, 'An internal error occurred.', err);
    }
});

router.post('/upload', authenticateToken, (req: Request, res: Response) => {
    upload.single('file')(req, res, async (uploadErr: any) => {
        if (uploadErr) {
            if (uploadErr.code === 'LIMIT_FILE_SIZE') {
                res.status(413).json({ error: `File is too large. Maximum upload size is ${MAX_UPLOAD_SIZE_MB} MB.` });
                return;
            }
            res.status(400).json({ error: (uploadErr instanceof Error ? uploadErr.message : String(uploadErr)) || 'Upload failed.' });
            return;
        }

        try {
            if (!(req as any).file) {
                res.status(400).json({ error: 'No file uploaded' });
                return;
            }
            const filePath = await processFile((req as any).file);
            const fullUrl = filePath.startsWith('http') ? filePath : `${req.protocol}://${req.get('host')}${filePath}`;
            res.json({ url: fullUrl });
        } catch (err: unknown) {
            errorResponse(res, 500, 'An internal error occurred.', err);
        }
    });
});

export = router;
