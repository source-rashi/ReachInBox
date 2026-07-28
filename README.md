# ReachInBox — Email Job Scheduler

Production-grade email scheduling system built with BullMQ delayed jobs, Redis-backed rate limiting, PostgreSQL persistence, and restart durability.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Frontend (Next.js)                     │
│  Google OAuth → Dashboard → Compose → Schedule API       │
└──────────────┬──────────────────────────────────────────┘
               │ HTTP (proxied via Next.js rewrites)
┌──────────────▼──────────────────────────────────────────┐
│                   Backend (Express)                      │
│  Routes → Controllers → Services                        │
│                                                          │
│  ┌──────────┐   ┌──────────┐   ┌────────────────┐       │
│  │ Schedule  │──▶│  BullMQ  │──▶│    Worker       │       │
│  │ Service   │   │  Queue   │   │ (rate-limited)  │       │
│  └────┬─────┘   └──────────┘   └───────┬────────┘       │
│       │                                 │                │
│  ┌────▼─────┐              ┌───────────▼─────────┐      │
│  │ Postgres │              │ Ethereal SMTP        │      │
│  │ (Prisma) │              │ + Redis Rate Limiter │      │
│  └──────────┘              └─────────────────────┘      │
│                                                          │
│  Boot Reconciler: re-enqueues orphaned jobs on restart   │
└──────────────────────────────────────────────────────────┘
```

## Features

- [x] **Delayed job scheduling** — BullMQ delayed jobs, no cron
- [x] **Redis rate limiting** — Lua-scripted atomic hour-window counters per sender
- [x] **Never drop on rate limit** — requeue into next window automatically
- [x] **Idempotency** — SHA-256 dedupe key (recipient + subject + scheduledFor), unique DB constraint
- [x] **Restart durability** — boot-time reconciler re-enqueues orphaned jobs
- [x] **Postgres as source of truth** — BullMQ/Redis is execution layer only
- [x] **CSV upload** — auto-detects email column, validates entries
- [x] **Multi-sender support** — senders created/upserted on schedule
- [x] **Ethereal SMTP** — test email sending with preview URLs
- [x] **Google OAuth** — real NextAuth Google provider
- [x] **Configurable** — rate limits, concurrency, delays all via env vars

## Setup

### Prerequisites

- Node.js 18+
- Docker + Docker Compose (for Postgres + Redis)
- Google Cloud OAuth 2.0 credentials

### 1. Clone and install

```bash
git clone <repo-url>
cd reachinbox

# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (port 5432) and Redis (port 6379).

### 3. Configure environment

```bash
cp .env.example backend/.env
cp .env.example frontend/.env.local
```

Edit both files:

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | backend | Postgres connection string |
| `REDIS_URL` | backend | Redis connection string |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | backend | Ethereal credentials |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | backend | Rate limit per sender (default: 100) |
| `MIN_DELAY_MS_BETWEEN_SENDS` | backend | Throttle between sends (default: 2000) |
| `WORKER_CONCURRENCY` | backend | BullMQ worker concurrency (default: 3) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | frontend | Google OAuth credentials |
| `NEXTAUTH_URL` | frontend | Frontend URL (default: http://localhost:3000) |
| `NEXTAUTH_SECRET` | frontend | Random string for JWT signing |

### 4. Generate Ethereal credentials

Go to [https://ethereal.email](https://ethereal.email) and click "Create Ethereal Account". Copy the SMTP host, port, username, and password into your backend `.env`.

### 5. Set up Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `http://localhost:3000` to Authorized JavaScript origins
4. Add `http://localhost:3000/api/auth/callback/google` to Authorized redirect URIs
5. Copy Client ID and Secret to frontend `.env.local`

### 6. Run database migration

```bash
cd backend
npx prisma migrate dev --name init
cd ..
```

### 7. Start the application

```bash
# Terminal 1 — Backend
cd backend
npm run dev

# Terminal 2 — Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:4000
- Backend health check: http://localhost:4000/health

## How It Works

### Job Lifecycle

1. User schedules via UI → `POST /api/schedule`
2. Service generates dedupe key (SHA-256 of recipient+subject+scheduledFor)
3. Checks DB for existing dedupe key (idempotency)
4. Creates `EmailJob` in Postgres with status `scheduled`
5. Enqueues BullMQ delayed job → status becomes `queued`
6. Worker picks up at scheduled time
7. Worker checks Redis rate limit (Lua atomic counter)
   - If allowed → sends via SMTP, writes `SendLog`, status → `sent`
   - If rate limited → re-enqueues with delay to next window, stays `queued`
8. On server restart → reconciler finds orphaned `scheduled`/`queued` rows → re-enqueues

### Rate Limiting

Uses a Lua script for atomic increment-and-check on Redis keys. Key pattern: `ratelimit:{senderId}:{hourBucket}`. When the hourly limit is hit, the worker calculates the time remaining in the current window and re-enqueues with that delay + 1s buffer. Jobs are **never** dropped or failed due to rate limiting.

### Idempotency

Each job gets a dedupe key = `SHA-256(recipientEmail | subject | scheduledFor)`. This is stored as a unique column in Postgres. Duplicate schedule requests are rejected both at the service level (pre-check) and at the DB level (unique constraint).

## Assumptions & Trade-offs

1. **Single-process worker**: The worker runs in the same process as the Express server. For production, these should be separate processes. The reconciler handles the restart case.

2. **Ethereal-only SMTP**: No production SMTP configuration. Ethereal is sufficient for demonstration. Swapping to SendGrid/SES would only require changing the transport config.

3. **No per-campaign grouping**: Jobs are individual rows. A campaign abstraction could be added but isn't needed for the core scheduling + rate limiting demo.

4. **Rate limit per sender, not per recipient domain**: Some production systems rate limit per-domain (e.g. max 50/hr to gmail.com). This implementation limits per sender, which is the more common use case for outreach tools.

5. **Frontend proxy**: Next.js rewrites proxy API calls to the backend. In production, you'd use a reverse proxy (nginx, Cloudflare) instead.

6. **CSV size limit**: 5MB max file size for CSV uploads. Large lead lists should be paginated or streamed.

7. **No email templating engine**: The body is sent as raw HTML. A Handlebars/Mustache layer for `{{name}}` interpolation would be a natural next step.

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | TypeScript, Express.js |
| Queue | BullMQ + Redis (delayed jobs only) |
| Database | PostgreSQL + Prisma ORM |
| SMTP | Nodemailer + Ethereal Email |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Auth | NextAuth.js + Google OAuth 2.0 |
| Infrastructure | Docker Compose (Postgres + Redis) |
