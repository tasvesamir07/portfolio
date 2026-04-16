import app from './server.js';

export default {
  async fetch(request, env, ctx) {
    // This allows your Express app to receive the Cloudflare environment
    // so it can access DATABASE_URL and SUPABASE keys.
    Object.assign(process.env, env);
    return app(request, env, ctx);
  },
};
