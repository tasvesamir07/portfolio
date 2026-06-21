const request = require('supertest');
const app = require('../server');
const db = require('../db');
const jwt = require('jsonwebtoken');

jest.mock('../db', () => ({
    query: jest.fn(),
    connect: jest.fn(),
}));

describe('Pages CRUD API Routes Tests', () => {
    let validToken;

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.JWT_SECRET = 'test_secret_key_123456';
        validToken = jwt.sign(
            { id: 1, username: 'admin', email: 'admin@example.com' },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );
    });

    describe('GET /api/v1/pages', () => {
        it('should return a list of pages without content by default', async () => {
            const mockPages = [
                { id: 1, title: 'Home', slug: 'home', show_in_nav: true }
            ];
            db.query.mockResolvedValueOnce({ rows: mockPages });

            const res = await request(app)
                .get('/api/v1/pages')
                .expect(200);

            expect(res.body).toEqual(mockPages);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, title, slug, show_in_nav FROM pages')
            );
        });

        it('should return content when includeContent=1', async () => {
            const mockPages = [
                { id: 1, title: 'Home', slug: 'home', content: 'Hello', details_json: '', show_in_nav: true }
            ];
            db.query.mockResolvedValueOnce({ rows: mockPages });

            const res = await request(app)
                .get('/api/v1/pages?includeContent=1')
                .expect(200);

            expect(res.body).toEqual(mockPages);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('SELECT id, title, slug, content, details_json, show_in_nav FROM pages')
            );
        });
    });

    describe('GET /api/v1/pages/page', () => {
        it('should fetch a single page by slug', async () => {
            const mockPage = { id: 1, title: 'Home', slug: 'home', content: 'Hello' };
            db.query.mockResolvedValueOnce({ rows: [mockPage] });

            const res = await request(app)
                .get('/api/v1/pages/page?slug=home')
                .expect(200);

            expect(res.body).toEqual(mockPage);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE slug = $1'),
                ['home']
            );
        });

        it('should fetch a single page by id', async () => {
            const mockPage = { id: 1, title: 'Home', slug: 'home', content: 'Hello' };
            db.query.mockResolvedValueOnce({ rows: [mockPage] });

            const res = await request(app)
                .get('/api/v1/pages/page?id=1')
                .expect(200);

            expect(res.body).toEqual(mockPage);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('WHERE id = $1'),
                [1]
            );
        });

        it('should return 400 if slug and id are missing', async () => {
            await request(app)
                .get('/api/v1/pages/page')
                .expect(400);
        });

        it('should return 404 if page not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/v1/pages/page?slug=notfound')
                .expect(404);
        });
    });

    describe('GET /api/v1/pages/:slug', () => {
        it('should fetch a page by slug parameter', async () => {
            const mockPage = { id: 2, title: 'About', slug: 'about', content: 'Details' };
            db.query.mockResolvedValueOnce({ rows: [mockPage] });

            const res = await request(app)
                .get('/api/v1/pages/about')
                .expect(200);

            expect(res.body).toEqual(mockPage);
        });

        it('should return 404 if slug parameter not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .get('/api/v1/pages/unknown-page')
                .expect(404);
        });
    });

    describe('POST /api/v1/pages', () => {
        const newPage = {
            title: 'Contact',
            slug: 'contact',
            content: 'Contact form page',
            show_in_nav: true,
            details_json: '[]'
        };

        it('should create page when authorized', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 3, ...newPage }] });

            const res = await request(app)
                .post('/api/v1/pages')
                .set('Authorization', `Bearer ${validToken}`)
                .send(newPage)
                .expect(201);

            expect(res.body.title).toBe('Contact');
            expect(res.body.slug).toBe('contact');
        });

        it('should return 401 when unauthorized', async () => {
            await request(app)
                .post('/api/v1/pages')
                .send(newPage)
                .expect(401);
        });
    });

    describe('PUT /api/v1/pages/:id', () => {
        const updateData = {
            title: 'Updated Contact',
            slug: 'contact-us',
            content: 'Updated form content',
            show_in_nav: false,
            details_json: '[]'
        };

        it('should update page when authorized', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ id: 3, ...updateData }] });

            const res = await request(app)
                .put('/api/v1/pages/3')
                .set('Authorization', `Bearer ${validToken}`)
                .send(updateData)
                .expect(200);

            expect(res.body.title).toBe('Updated Contact');
            expect(res.body.slug).toBe('contact-us');
        });
    });

    describe('DELETE /api/v1/pages/:id', () => {
        it('should delete page when authorized', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            await request(app)
                .delete('/api/v1/pages/3')
                .set('Authorization', `Bearer ${validToken}`)
                .expect(204);

            expect(db.query).toHaveBeenCalledWith(
                expect.stringContaining('DELETE FROM pages WHERE id = $1'),
                ['3']
            );
        });
    });
});
