import app from './server.js';
import { Buffer } from 'node:buffer';

export default {
    async fetch(request, env, ctx) {
        Object.assign(process.env, env);

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
        
        // 🛠️ ROBUST REQUEST BRIDGE
        const listeners = { data: [], end: [] };
        const mockReq = {
            method: request.method,
            url: url.pathname + url.search,
            headers: Object.fromEntries(request.headers),
            query: Object.fromEntries(url.searchParams),
            params: {},
            body: {},
            complete: true,
            on(event, callback) {
                if (listeners[event]) listeners[event].push(callback);
                if (event === 'data' && this._bodyStr) {
                    setTimeout(() => callback(Buffer.from(this._bodyStr)), 10);
                }
                if (event === 'end' && this._bodyDone) {
                    setTimeout(() => callback(), 20);
                }
                return this;
            },
            once(event, callback) { return this.on(event, callback); },
            removeListener() { return this; },
            removeAllListeners() { return this; },
            emit(event, data) {
                if (listeners[event]) {
                    listeners[event].forEach(cb => cb(data));
                }
            },
            unpipe: () => {},
            resume: () => {},
            pause: () => {},
            protocol: 'https',
            secure: true,
            get: (name) => request.headers.get(name),
            header: (name) => request.headers.get(name),
        };

        if (request.method !== 'GET' && request.method !== 'HEAD') {
            try {
                const text = await request.clone().text();
                mockReq._bodyStr = text;
                const contentType = request.headers.get('content-type') || '';
                if (contentType.includes('application/json')) {
                    mockReq.body = JSON.parse(text);
                }
                mockReq.complete = true;
                mockReq._bodyDone = true;
                mockReq._body = true;
            } catch (e) {
                console.warn('Body parse failed:', e.message);
                mockReq._bodyDone = true;
                mockReq._body = true;
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
                on() { return this; },
                once() { return this; },
                removeListener() { return this; },
                removeAllListeners() { return this; },
                emit() { return this; },
                removeHeader: (name) => { resHeaders.delete(name); }
            };

            try {
                console.log(`[Bridge] Processing ${mockReq.method} ${mockReq.url}`);
                app(mockReq, mockRes, (err) => {
                    if (err) {
                        console.error('[Bridge] Express Fallthrough Error:', err);
                        resolve(new Response(JSON.stringify({ error: err.message }), {
                            status: 500,
                            headers: resHeaders
                        }));
                    } else {
                        console.log('[Bridge] Route not found by Express');
                        resolve(new Response(JSON.stringify({ error: 'Route not found', path: mockReq.url }), {
                            status: 404,
                            headers: resHeaders
                        }));
                    }
                });
            } catch (err) {
                console.error('[Bridge] Worker Bridge Crash:', err);
                resolve(new Response(JSON.stringify({ error: 'Worker Bridge Crash', detail: err.message }), {
                    status: 500,
                    headers: resHeaders
                }));
            }
        });
    },
};
