# ReachInBox — Email Job Scheduler

Production-grade email scheduling system built with BullMQ delayed jobs, Redis-backed rate limiting, PostgreSQL persistence, and restart durability.

## 🚀 Live Deployments & URLs

- 🌐 **Live Website (Vercel)**: [https://reachinbox-app-theta.vercel.app](https://reachinbox-app-theta.vercel.app)
- ⚡ **Live Backend API (Render)**: [https://reachinbox-backend-39mw.onrender.com](https://reachinbox-backend-39mw.onrender.com)
- 💓 **Backend Health Endpoint**: [https://reachinbox-backend-39mw.onrender.com/health](https://reachinbox-backend-39mw.onrender.com/health)
- 📦 **GitHub Repository**: [https://github.com/source-rashi/ReachInBox](https://github.com/source-rashi/ReachInBox)

---

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
- [x] **CSV upload & Manual Email Input** — auto-detects email column, validates entries
- [x] **Multi-sender support** — senders created/upserted on schedule
- [x] **Ethereal SMTP** — test email sending with preview URLs
- [x] **Google OAuth & Demo Account** — real NextAuth Google provider + instant demo login
- [x] **Configurable** — rate limits, concurrency, delays all via env vars

## Setup

### Prerequisites

- Node.js 18+
- Docker + Docker Compose (for Postgres + Redis)
- Google Cloud OAuth 2.0 credentials

### 1. Clone and install

```bash
git clone https://github.com/source-rashi/ReachInBox.git
cd ReachInBox

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

**Backend** — copy the example and fill in SMTP credentials:
```bash
cp .env.example backend/.env
```

**Frontend** — create `frontend/.env.local`:
```bash
cat > frontend/.env.local << 'EOF'
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=https://reachinbox-app-theta.vercel.app
NEXTAUTH_SECRET=change-me-to-a-random-string
BACKEND_URL=https://reachinbox-backend-39mw.onrender.com
EOF
```

| Variable | File | Description |
|---|---|---|
| `DATABASE_URL` | backend/.env | Postgres connection string |
| `REDIS_URL` | backend/.env | Redis connection string |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | backend/.env | Ethereal credentials |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | backend/.env | Rate limit per sender (default: 100) |
| `MIN_DELAY_MS_BETWEEN_SENDS` | backend/.env | Throttle between sends (default: 2000) |
| `WORKER_CONCURRENCY` | backend/.env | BullMQ worker concurrency (default: 3) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | frontend/.env.local | Google OAuth credentials |
| `NEXTAUTH_URL` | frontend/.env.local | Frontend URL (default: http://localhost:3000) |
| `NEXTAUTH_SECRET` | frontend/.env.local | Random string for JWT signing |

### 4. Generate Ethereal credentials

Go to [https://ethereal.email](https://ethereal.email) and click "Create Ethereal Account". Copy the SMTP host, port, username, and password into your backend `.env`.

### 5. Start the application

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

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | TypeScript, Express.js |
| Queue | BullMQ + Redis (delayed jobs only) |
| Database | PostgreSQL + Prisma ORM |
| SMTP | Nodemailer + Ethereal Email |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| Auth | NextAuth.js + Google OAuth 2.0 |
| Deployment | Vercel (Frontend) + Render (Backend, Postgres 18, Valkey Redis 8) |
