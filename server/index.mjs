import app from './server.js';

export default {
    async fetch(request, env, ctx) {
        Object.assign(process.env, env);

        // 🛡️ SMART CORS: Echo origin for better stability
        const origin = request.headers.get('Origin') || '*';
        const corsHeaders = {
            'Access-Control-Allow-Origin': origin,
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate',
            'Access-Control-Allow-Credentials': 'true',
        };

        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        const url = new URL(request.url);
        
        // 🛠️ ADVANCED BRIDGE: Mocking Node.js Stream methods
        // This prevents body-parser from hanging or crashing
        const mockReq = {
            method: request.method,
            url: url.pathname + url.search,
            headers: Object.fromEntries(request.headers),
            query: Object.fromEntries(url.searchParams),
            params: {},
            body: {},
            // Stream polyfills for body-parser
            on(event, callback) {
                if (event === 'data' && this._bodyStr) {
                    callback(Buffer.from(this._bodyStr));
                }
                if (event === 'end') {
                    callback();
                }
                return this;
            },
            once: function(event, callback) { return this.on(event, callback); },
            emit: () => {},
            unpipe: () => {},
            resume: () => {},
            pause: () => {},
            protocol: 'https',
            secure: true,
            get: (name) => request.headers.get(name),
        };

        // Pre-parse body for Express
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                const text = await request.clone().text();
                mockReq._bodyStr = text;
                const contentType = request.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    mockReq.body = JSON.parse(text);
                }
            } catch (e) {
                console.warn('Body parse failed:', e.message);
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
