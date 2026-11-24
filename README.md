# LCO Attendance

Desktop attendance app: **Electron + React + shadcn/ui** frontend, **FastAPI** backend, **PostgreSQL** via Docker.

## Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for the Electron frontend)
- [uv](https://docs.astral.sh/uv/) (optional for local backend work outside Docker)

## Quick start

### 1. Environment

```bash
cp .env.example .env
```

Postgres listens on host port **5434** (avoids clashing with another Postgres on 5432). Compose uses host networking so the Snap Docker port-proxy does not break local DB connections.

### 2. Start API + database

```bash
docker compose up --build
```

Or DB only + API on the host:

```bash
docker compose up db -d
cd backend
uv run alembic upgrade head
uv run fastapi dev
```

- API: http://localhost:8000
- Health: http://localhost:8000/health
- Docs: http://localhost:8000/docs

### 3. Run the desktop app

```bash
cd frontend
npm install
npm run dev
```

The Electron window calls `VITE_API_URL` (default `http://localhost:8000`) and shows API health status.

### Migrations

```bash
cd backend
uv run alembic upgrade head
```

With the backend container running:

```bash
docker compose exec backend alembic upgrade head
```

## Project layout

| Path | Role |
|------|------|
| `frontend/` | Electron + Vite + React + TypeScript + shadcn/ui (runs on host) |
| `backend/` | FastAPI + SQLAlchemy + Alembic (runs in Docker) |
| `docker-compose.yml` | PostgreSQL + backend only |

## Stopping

```bash
docker compose down
```
