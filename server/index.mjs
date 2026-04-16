import app from './server.js';

export default {
    async fetch(request, env, ctx) {
        Object.assign(process.env, env);

        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate',
            'Access-Control-Allow-Credentials': 'true',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        // 🛠️ DETACHED REQUEST: Create a plain JS object
        // We copy ONLY the data from the Cloudflare request.
        // This makes the object 100% mutable for Express.
        const url = new URL(request.url);
        const mockReq = {
            method: request.method,
            url: url.pathname + url.search,
            headers: Object.fromEntries(request.headers),
            query: Object.fromEntries(url.searchParams),
            params: {},
            body: {},
            // Mocking EventEmitter methods that Express/Middleware might use
            on: () => {},
            once: () => {},
            emit: () => {},
            protocol: 'https',
            secure: true,
            get: (name) => request.headers.get(name),
            header: (name) => request.headers.get(name),
        };

        // Try to parse body if it exists
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                const contentType = request.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    mockReq.body = await request.clone().json();
                }
            } catch (e) {
                // If body parsing fails, we just leave it as empty
            }
        }

        return new Promise((resolve) => {
            let resStatus = 200;
            const resHeaders = new Headers(corsHeaders);
            let resBody = '';

            const mockRes = {
                status(code) { resStatus = code; return this; },
                statusCode: 200,
                json(data) {
                    this.setHeader('Content-Type', 'application/json');
                    this.end(JSON.stringify(data));
                    return this;
                },
                send(data) { this.end(data); return this; },
                setHeader(name, value) {
                    resHeaders.set(name, value);
                    return this;
                },
                header(name, value) { return this.setHeader(name, value); },
                getHeader(name) { return resHeaders.get(name); },
                get(name) { return this.getHeader(name); },
                set(name, value) { return this.setHeader(name, value); },
                end(data) {
                    // Update status if it was set via .statusCode directly
                    if (this.statusCode !== 200 && resStatus === 200) resStatus = this.statusCode;
                    
                    resolve(new Response(data || resBody, {
                        status: resStatus,
                        headers: resHeaders
                    }));
                },
                locals: {},
                on: () => {},
                emit: () => {},
                removeHeader: (name) => { resHeaders.delete(name); }
            };

            try {
                // Pass the DETACHED request to Express
                app(mockReq, mockRes, (err) => {
                    if (err) {
                        resolve(new Response(JSON.stringify({ error: err.message }), {
                            status: 500,
                            headers: resHeaders
                        }));
                    }
                });
            } catch (err) {
                resolve(new Response(JSON.stringify({ error: 'Worker Crash', detail: err.message }), {
                    status: 500,
                    headers: resHeaders
                }));
            }
        });
    },
};
