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

        // 🛠️ FIX: Create a MUTABLE request object for Express
        // Cloudflare's Request object is read-only, which crashes Express.
        const reqProxy = new Proxy(request, {
            get: (target, prop) => {
                const val = target[prop];
                if (typeof val === 'function') return val.bind(target);
                return val;
            },
        });
        
        // We add a simple storage for properties that Express tries to set
        const extraProps = new Map();
        const mutableReq = new Proxy(reqProxy, {
            get: (target, prop) => extraProps.has(prop) ? extraProps.get(prop) : target[prop],
            set: (target, prop, value) => {
                extraProps.set(prop, value);
                return true;
            }
        });

        return new Promise((resolve) => {
            let resStatus = 200;
            const resHeaders = new Headers(corsHeaders);
            let resBody = '';

            const mockRes = {
                status(code) { resStatus = code; return this; },
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
                // Pass the MUTABLE request to Express
                app(mutableReq, mockRes, (err) => {
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
