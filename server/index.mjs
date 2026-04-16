import app from './server.js';
import serverless from 'serverless-http';

// We wrap the Express app with serverless-http
// specifically configured for Cloudflare Workers
const handler = serverless(app, {
    provider: 'cloudflare'
});

export default {
    async fetch(request, env, ctx) {
        // 1. Inject environment variables into process.env
        // This is still needed so the Express app sees DATABASE_URL, etc.
        Object.assign(process.env, env);

        // 2. Use the handler to process the request
        const response = await handler(request, env, ctx);

        // 3. Ensure CORS headers are present on every response
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate');
        newResponse.headers.set('Access-Control-Allow-Credentials', 'true');

        return newResponse;
    },
};
