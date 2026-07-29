# Deployment Guide: ReachInBox on Vercel & Render

This guide outlines how to deploy the **ReachInBox** application:
- **Backend (Express + BullMQ + Prisma PostgreSQL + Redis)** on **Render**
- **Frontend (Next.js)** on **Vercel**

---

## Architecture Summary

```
┌──────────────────────────────────────┐       ┌──────────────────────────────────────┐
│           Vercel (Frontend)          │       │           Render (Backend)           │
│   Next.js 15 App                     │──────▶│   Express API + BullMQ Worker        │
│   Google OAuth + UI                  │       │   PostgreSQL DB + Redis Cache        │
└──────────────────────────────────────┘       └──────────────────────────────────────┘
```

---

## Phase 1: Deploy Backend, Database & Redis on Render

### Option A: Using Render Blueprints (Recommended)

1. Push this repository to GitHub.
2. Sign in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** → **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect `render.yaml` and prompt you to create:
   - **`reachinbox-db`**: PostgreSQL Database
   - **`reachinbox-redis`**: Managed Redis Instance
   - **`reachinbox-backend`**: Web Service
6. Fill in the missing required environment variables:
   - `SMTP_USER` & `SMTP_PASS` (Get free credentials at [ethereal.email](https://ethereal.email))
   - `FRONTEND_URL` (Set to your Vercel deployment URL, e.g. `https://your-app.vercel.app`)
7. Click **Apply**. Render will provision the database, redis, run Prisma migrations, and launch your API service.

---

### Option B: Manual Setup on Render

#### 1. Create PostgreSQL Database
- Go to Render → **New +** → **PostgreSQL**.
- Name: `reachinbox-db`, Database: `reachinbox`.
- Copy the **Internal Database URL**.

#### 2. Create Redis (or Upstash Redis)
- Render: **New +** → **Redis** → Name `reachinbox-redis`. Copy **Internal Redis URL**.
- *Alternative*: Create a free Redis database on [Upstash](https://upstash.com) and copy `rediss://...` URL.

#### 3. Create Web Service
- Render → **New +** → **Web Service**.
- Select your repository.
- Settings:
  - **Root Directory**: `backend`
  - **Environment**: Node
   - **Build Command**: `npm ci && npm run db:generate && npm run build`
   - **Start Command**: `npm run db:deploy && npm start`
- Environment Variables:
  ```env
  DATABASE_URL=<your-internal-postgres-url>
  REDIS_URL=<your-internal-redis-url>
  NODE_ENV=production
  PORT=10000
  FRONTEND_URL=https://<your-vercel-app>.vercel.app
  SMTP_HOST=smtp.ethereal.email
  SMTP_PORT=587
  SMTP_USER=<your-ethereal-user>
  SMTP_PASS=<your-ethereal-pass>
  MAX_EMAILS_PER_HOUR_PER_SENDER=100
  MIN_DELAY_MS_BETWEEN_SENDS=2000
  WORKER_CONCURRENCY=3
  ```
- Save and Deploy. Copy your Render Web Service URL (e.g. `https://reachinbox-backend.onrender.com`).

---

## Phase 2: Deploy Frontend on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New** → **Project**.
2. Import your GitHub repository.
3. In **Project Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: Select `frontend`
4. Expand **Environment Variables** and add:
   ```env
   BACKEND_URL=https://reachinbox-backend.onrender.com
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=generate-a-32-char-random-string
   GOOGLE_CLIENT_ID=your-google-oauth-client-id
   GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
   ```
5. Click **Deploy**.

---

## Phase 3: Configure Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials.
2. Edit your OAuth 2.0 Client ID.
3. Under **Authorized JavaScript origins**, add:
   - `https://your-app.vercel.app`
4. Under **Authorized redirect URIs**, add:
   - `https://your-app.vercel.app/api/auth/callback/google`
5. Save changes.

---

## Health Check & Verification

1. Verify backend health endpoint:
   `https://reachinbox-backend.onrender.com/health` (should return `{"status":"ok"}`)
2. Open frontend application:
   `https://your-app.vercel.app`
3. Sign in via Google OAuth, schedule an email job, and check that jobs process through BullMQ and rate limits seamlessly.
