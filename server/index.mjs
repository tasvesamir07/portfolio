import app from './server.js';

export default {
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight (OPTIONS) requests immediately
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // 2. Inject environment variables into process.env
    Object.assign(process.env, env);

    try {
      // 3. Call the Express app
      const response = await app(request, env, ctx);

      // 4. Wrap the response to ensure CORS headers are ATTACHED
      // This is necessary because some Express adapters don't propagate headers correctly
      const newResponse = new Response(response.body, response);
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-translate-language, x-skip-auto-translate');
      newResponse.headers.set('Access-Control-Allow-Credentials', 'true');

      return newResponse;
    } catch (err) {
      console.error('Worker Error:', err);
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      });
    }
  },
};
