# 🚀 Cloudflare + Supabase Deployment Guide

I have updated your code to be fully compatible with **Cloudflare Workers** (Backend), **Cloudflare Pages** (Frontend), **Neon.tech** (Database), and **Supabase** (Storage). This setup is **100% free** and requires no credit card.

---

## 🏗️ 1. Database Setup (Neon.tech)
1.  Go to [Neon.tech](https://neon.tech/) and create a free project.
2.  Open the **SQL Editor** tab in Neon.
3.  Open the **[schema.sql](file:///i:/Portfolio%20Samir/schema.sql)** file in this project, copy **everything**, and paste it into Neon's SQL editor. Run it.
4.  Go to **Dashboard** and copy your `Connection String` (e.g., `postgresql://user:password@host/neondb`). **Save this.**

## 📦 2. File Storage Setup (Supabase)
1.  Sign up for a free account at [Supabase.com](https://supabase.com/).
2.  Create a project named `Portfolio Samir`.
3.  Go to **Storage** -> **Create bucket**. Name it `portfolio-uploads`.
4.  **CRITICAL**: Check the box for **"Public bucket"**.
5.  Go to **Project Settings** -> **API** and copy:
    -   `Project URL`
    -   `service_role` (Secret Key)

## ⚙️ 3. Deploy the Backend (Cloudflare Worker)
In your terminal, go to the `server` folder and run these exact commands:

```powershell
# 1. Login to Cloudflare
npx wrangler login

# 2. Add your Database & JWT Secrets
npx wrangler secret put DATABASE_URL        # Paste your Neon Connection String
npx wrangler secret put JWT_SECRET          # Type a random password (e.g. 'samir_secret_123')

# 3. Add your Supabase Keys
npx wrangler secret put SUPABASE_URL                # Paste your Project URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # Paste your service_role Key

# 4. Deploy your API
npx wrangler deploy
```
**Important:** Copy the URL it gives you at the end (e.g., `https://portfolio-samir-api.samir.workers.dev`).

## 🌐 4. Deploy the Frontend (Cloudflare Pages)
1.  Go to **Workers & Pages** -> **Create** -> **Pages** -> **Connect to Git**.
2.  Select your GitHub repository.
3.  Set the **Build Settings**:
    -   **Framework preset**: Vite
    -   **Build command**: `npm run build`
    -   **Build output directory**: `dist`
    -   **Root directory**: `/client`
4.  **Add Environment Variable**:
    -   Name: `VITE_API_URL`
    -   Value: Your **Worker URL** from Step 3 (the one ending in `.workers.dev`).
5.  Click **Save and Deploy**.

---

### ✅ Deployment Checklist
- [ ] Database tables created in Neon?
- [ ] Supabase bucket `portfolio-uploads` created and set to **Public**?
- [ ] Secrets added via `wrangler secret put`?
- [ ] `VITE_API_URL` added to Pages Environment Variables?

**Congratulations! Your portfolio is now live on the Edge! 🚀**
If you see any errors, let me know and I will help you fix them.
