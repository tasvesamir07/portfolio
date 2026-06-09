const request = require('supertest');
const app = require('../server');
const db = require('../db');
const jwt = require('jsonwebtoken');

// Mock db
jest.mock('../db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

jest.mock('../utils/audit', () => ({
    logAuditActivity: jest.fn(),
}));

jest.mock('nodemailer', () => ({
    createTransport: jest.fn().mockReturnValue({
        sendMail: jest.fn().mockResolvedValue(true),
    }),
}));

// Mock bcryptjs to avoid CPU bottleneck and be fully deterministic
jest.mock('bcryptjs', () => ({
    compare: jest.fn().mockImplementation((pwd, hash) => {
        if (pwd === 'password123' && hash === 'mocked_hash') return true;
        return false;
    }),
    hash: jest.fn().mockResolvedValue('mocked_hash'),
}));

describe('Auth Flow API Tests', () => {
    let mockUser;
    let validToken;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret_key_123456';
        process.env.PURCHASE_EMAIL_USER = 'test@example.com';
        process.env.PURCHASE_EMAIL_PASS = 'testpass';
        
        mockUser = {
            id: 1,
            username: 'admin',
            email: 'admin@example.com',
            password_hash: 'mocked_hash',
            otp_hash: null,
            otp_expires_at: null,
            pending_username: null,
            pending_email: null,
            pending_password_hash: null
        };

        validToken = jwt.sign(
            { id: mockUser.id, username: mockUser.username, email: mockUser.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    describe('POST /api/v1/admin-login', () => {
        it('should login successfully with valid credentials', async () => {
            db.query.mockResolvedValueOnce({ rows: [mockUser] });

            const res = await request(app)
                .post('/api/v1/admin-login')
                .send({
                    identifier: 'admin',
                    password: 'password123'
                });

            if (res.status !== 200) console.log('DEBUG LOGIN ERR:', res.body);
            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
            expect(res.body.user.username).toBe('admin');
        });

        it('should return 401 with invalid credentials', async () => {
            db.query.mockResolvedValueOnce({ rows: [mockUser] });

            const res = await request(app)
                .post('/api/v1/admin-login')
                .send({
                    identifier: 'admin',
                    password: 'wrongpassword'
                });

            expect(res.status).toBe(401);
        });

        it('should return 400 when identifier or password is empty', async () => {
            const res = await request(app)
                .post('/api/v1/admin-login')
                .send({
                    identifier: '',
                    password: ''
                });

            if (res.status !== 400) console.log('DEBUG EMPTY ERR:', res.body);
            expect(res.status).toBe(400);
        });
    });

    describe('POST /api/v1/forgot-password', () => {
        it('should generate OTP and return success if email exists', async () => {
            db.query.mockResolvedValueOnce({ rows: [mockUser] }); // Select user
            db.query.mockResolvedValueOnce({ rows: [] }); // Update user

            const res = await request(app)
                .post('/api/v1/forgot-password')
                .send({ email: 'admin@example.com' });

            if (res.status !== 200) console.log('DEBUG FORGOT ERR:', res.body);
            expect(res.status).toBe(200);
            expect(res.body.message).toContain('OTP was sent');
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('should return 404 if email does not exist', async () => {
            db.query.mockResolvedValueOnce({ rows: [] }); // Select user empty

            const res = await request(app)
                .post('/api/v1/forgot-password')
                .send({ email: 'nonexistent@example.com' });

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/v1/session', () => {
        it('should return authenticated session with valid token', async () => {
            const res = await request(app)
                .get('/api/v1/session')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(200);

            expect(res.body.authenticated).toBe(true);
            expect(res.body.user.username).toBe('admin');
            expect(res.body).toHaveProperty('features');
            expect(res.body.features).toHaveProperty('newEditor');
        });

        it('should return 401 when no authorization header is provided', async () => {
            await request(app)
                .get('/api/v1/session')
                .expect(401);
        });
    });
});
