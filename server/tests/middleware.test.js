process.env.UPSTASH_REDIS_URL = 'https://mock-redis.upstash.io';
process.env.UPSTASH_REDIS_TOKEN = 'mock-token';

// Mock upstash redis
const mockRedisInstance = {
    get: jest.fn(),
    set: jest.fn(),
    keys: jest.fn(),
    del: jest.fn()
};

jest.mock('@upstash/redis', () => ({
    Redis: jest.fn().mockImplementation(() => mockRedisInstance)
}));

const validate = require('../middleware/validation');
const requestLogger = require('../middleware/requestLogger');
const csrfMiddleware = require('../middleware/csrf');
const queryCacheMiddleware = require('../middleware/queryCache');
const autoTranslate = require('../middleware/autoTranslate');
const { z } = require('zod');

jest.mock('../utils/logger', () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
}));

jest.mock('../translate', () => ({
    translateTexts: jest.fn().mockResolvedValue(['translated text']),
    getAllCachedTranslations: jest.fn().mockResolvedValue({ 'key': 'val' }),
    updateCachedTranslation: jest.fn().mockResolvedValue(true),
    deleteCachedTranslation: jest.fn().mockResolvedValue(true),
    getCacheStats: jest.fn().mockReturnValue({ l1Size: 10, maxEntries: 2000, redisConnected: false })
}));

describe('Server Middleware Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockRedisInstance.get.mockReset().mockResolvedValue(null);
        mockRedisInstance.set.mockReset().mockResolvedValue(true);
        mockRedisInstance.keys.mockReset().mockResolvedValue([]);
        mockRedisInstance.del.mockReset().mockResolvedValue(1);
    });

    describe('validation middleware', () => {
        const schema = z.object({
            name: z.string().min(1, 'Name is required'),
            age: z.number().optional()
        });

        it('should fail if request body is missing', () => {
            const req = {};
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            validate(schema)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'Request body is missing' });
            expect(next).not.toHaveBeenCalled();
        });

        it('should fail and return mapped Zod details if validation fails', () => {
            const req = { body: { name: '' } };
            const res = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            validate(schema)(req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Validation failed',
                details: [
                    { field: 'name', message: 'Name is required' }
                ]
            });
            expect(next).not.toHaveBeenCalled();
        });

        it('should replace body with Zod parsed data and call next if validation passes', () => {
            const req = { body: { name: 'Samir', age: 25, extra: 'discarded' } };
            const res = {};
            const next = jest.fn();

            validate(schema)(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(req.body).toEqual({ name: 'Samir', age: 25 });
        });
    });

    describe('requestLogger middleware', () => {
        it('should set X-Request-Id header and register finish listener', () => {
            const req = {
                headers: {},
                method: 'GET',
                url: '/test'
            };
            let finishListener = null;
            const res = {
                setHeader: jest.fn(),
                on: jest.fn().mockImplementation((event, listener) => {
                    if (event === 'finish') finishListener = listener;
                }),
                statusCode: 200
            };
            const next = jest.fn();

            requestLogger(req, res, next);

            expect(req.id).toBeDefined();
            expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', req.id);
            expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
            expect(next).toHaveBeenCalled();

            // Invoke registered finish listener to cover its logs
            if (finishListener) {
                expect(() => finishListener()).not.toThrow();
            }
        });
    });

    describe('csrf middleware', () => {
        let originalEnv;

        beforeEach(() => {
            originalEnv = process.env.NODE_ENV;
        });

        afterEach(() => {
            process.env.NODE_ENV = originalEnv;
        });

        it('should pass in test env', () => {
            process.env.NODE_ENV = 'test';
            const req = {};
            const res = {};
            const next = jest.fn();

            csrfMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should bypass CSRF if bearer token is present', () => {
            process.env.NODE_ENV = 'production';
            const req = {
                headers: { authorization: 'Bearer jwttoken' }
            };
            const res = {};
            const next = jest.fn();

            csrfMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should set XSRF-TOKEN cookie if missing on GET request', () => {
            process.env.NODE_ENV = 'production';
            const req = {
                method: 'GET',
                headers: {}
            };
            const res = {
                cookie: jest.fn()
            };
            const next = jest.fn();

            csrfMiddleware(req, res, next);

            expect(res.cookie).toHaveBeenCalledWith('XSRF-TOKEN', expect.any(String), expect.any(Object));
            expect(next).toHaveBeenCalled();
        });

        it('should block mutating request with mismatched CSRF token', () => {
            process.env.NODE_ENV = 'production';
            
            const req = {
                method: 'POST',
                path: '/api/v1/academics',
                headers: {
                    cookie: 'XSRF-TOKEN=valid-token',
                    'x-xsrf-token': 'wrong-token'
                }
            };
            const res = {
                cookie: jest.fn(),
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            const next = jest.fn();

            csrfMiddleware(req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('queryCache middleware', () => {
        it('should bypass non-GET requests and invalidate cache on mutations', async () => {
            mockRedisInstance.keys.mockResolvedValueOnce(['api_cache::en::/api/v1/about']);
            const req = { method: 'POST', originalUrl: '/api/v1/academics' };
            const res = {};
            const next = jest.fn();

            await queryCacheMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(mockRedisInstance.keys).toHaveBeenCalled();
            expect(mockRedisInstance.del).toHaveBeenCalledWith('api_cache::en::/api/v1/about');
        });

        it('should bypass GET requests to non-API paths', async () => {
            const req = { method: 'GET', originalUrl: '/about' };
            const res = {};
            const next = jest.fn();

            await queryCacheMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
        });

        it('should handle ETag and cache intercepts', async () => {
            const req = {
                method: 'GET',
                originalUrl: '/api/v1/academics',
                headers: {}
            };
            let jsonInterceptor = null;
            const originalJson = jest.fn();
            const res = {
                statusCode: 200,
                setHeader: jest.fn(),
                json: originalJson,
                status: jest.fn().mockReturnThis()
            };
            const next = jest.fn();

            await queryCacheMiddleware(req, res, next);

            expect(next).toHaveBeenCalled();
            expect(res.json).not.toBe(originalJson); // Intercepted

            // Call res.json to trigger cache write and ETag check
            res.json({ foo: 'bar' });
            expect(res.setHeader).toHaveBeenCalledWith('ETag', expect.stringContaining('W/"'));
            expect(originalJson).toHaveBeenCalledWith({ foo: 'bar' });
        });
    });

    describe('autoTranslate middleware', () => {
        it('should bypass response for English requests', () => {
            const originalJsonMock = jest.fn();
            const req = {
                headers: { 'x-translate-language': 'en' },
                method: 'GET',
                originalUrl: '/api/v1/academics'
            };
            const res = {
                json: originalJsonMock,
                locals: {}
            };
            const next = jest.fn();

            autoTranslate.middleware(req, res, next);

            expect(next).toHaveBeenCalled();
            
            res.json({ title: 'Hello' });
            expect(originalJsonMock).toHaveBeenCalledWith({ title: 'Hello' });
        });

        it('should bypass English requests even if response contains non-English text', () => {
            const originalJsonMock = jest.fn();
            const req = {
                headers: { 'x-translate-language': 'en' },
                method: 'GET',
                originalUrl: '/api/v1/academics'
            };
            const res = {
                json: originalJsonMock,
                locals: {},
                setHeader: jest.fn()
            };
            const next = jest.fn();

            autoTranslate.middleware(req, res, next);

            expect(next).toHaveBeenCalled();

            const banglaPayload = { title: 'ওমিক্স ডেটা' };
            const result = res.json(banglaPayload);
            expect(result).toBeUndefined();
            expect(originalJsonMock).toHaveBeenCalledWith(banglaPayload);
        });

        it('should localize data using localizeDataObject helper', () => {
            const rawData = {
                title_en: 'Hello English',
                title_bn: 'Hello Bangla',
                title_ko: 'Hello Korean',
                logo_url: 'http://img.jpg' // should skip localization
            };

            const bnLocalized = autoTranslate.localizeDataObject(rawData, 'bn');
            expect(bnLocalized.title).toBe('Hello Bangla');
            expect(bnLocalized.logo_url).toBe('http://img.jpg');

            const koLocalized = autoTranslate.localizeDataObject(rawData, 'ko');
            expect(koLocalized.title).toBe('Hello Korean');
        });
    });
});
