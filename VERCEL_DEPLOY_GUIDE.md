# Vercel Deployment Guide (Frontend + Backend)

This repo is a monorepo:

- `client` = Vite frontend
- `server` = Express API

Recommended Vercel setup is **2 separate projects**:

1. `portfolio-api` (root directory: `server`)
2. `portfolio-web` (root directory: `client`)

---

## 1. Backend on Vercel (`server`)

### Already added in code
- `server/api/[...all].js` (catch-all serverless entrypoint)
- `server/vercel.json` (function config)

### Create project
1. Go to Vercel Dashboard -> **Add New Project**.
2. Import this repo.
3. Set **Root Directory** = `server`.
4. Framework: **Other** (auto is fine).

### Environment variables (Backend)
Add these in Vercel Project Settings -> Environment Variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NODE_ENV=production` (optional, usually auto in Vercel)

### Deploy
- Trigger deploy from dashboard, or with CLI:

```powershell
cd server
npx vercel
```

After deploy, backend URL will look like:
- `https://portfolio-api.vercel.app`

Health check:
- `https://portfolio-api.vercel.app/api/ping`

---

## 2. Frontend on Vercel (`client`)

### Create project
1. Add another Vercel project from same repo.
2. Set **Root Directory** = `client`.
3. Framework Preset = **Vite**.

Vercel should use:
- Build command: `npm run build`
- Output directory: `dist`

### Environment variables (Frontend)
Add:

- `VITE_API_URL=https://portfolio-api.vercel.app/api`

Use your real backend URL, not this example.

### Deploy
- Deploy from dashboard, or:

```powershell
cd client
npx vercel
```

---

## 3. CORS / Domain Notes

Your current server CORS logic already allows unknown origins (fallback `callback(null, true)`), so frontend-backend cross-domain works on Vercel without extra changes.

If you later want strict CORS, whitelist:
- `https://<your-frontend>.vercel.app`
- your custom domain

---

## 4. Release Flow

When code changes:

1. Push to GitHub.
2. Vercel auto-deploys both projects.
3. If backend URL changes (preview domains), update frontend `VITE_API_URL` for production env if needed.

---

## 5. Quick Checklist

- [ ] Backend project root = `server`
- [ ] Frontend project root = `client`
- [ ] Backend env vars set
- [ ] Frontend `VITE_API_URL` set to backend `/api`
- [ ] `https://.../api/ping` returns `{ status: "ok" }`
- [ ] Frontend loads and API calls succeed

