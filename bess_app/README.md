# BESS Optimality Tool

FastAPI + PostgreSQL + React/Vite application for BESS sizing, financial analysis, BOM generation, supplier scoring, and comparison workflows.

## What This App Runs

- `postgres` service: stores all persistent app data
- `backend` service: FastAPI APIs on port `8000`
- `frontend` service: React UI on port `3000`

## Project Structure

```text
bess_app/
|-- docker-compose.yml
|-- .env.example
|-- backend/
|   |-- main.py
|   |-- database.py
|   |-- crud.py
|   |-- requirements.txt
|   |-- models/
|   `-- app/api/v1/
|-- frontend/
|   |-- package.json
|   |-- vite.config.js
|   `-- src/
`-- database/
		|-- schema.sql
		`-- indexes.sql
```

## Prerequisites

- Docker Desktop (Windows/macOS) or Docker Engine + Compose plugin (Linux)
- Port availability:
	- `3000` (frontend)
	- `8000` (backend)
	- `5432` (postgres)

## Quick Start (Docker, Recommended)

1. Open a terminal and move to the app folder:

```powershell
cd D:\gowdas-lab\ROI-Tool\bess_app
```

2. Create your env file (first time only):

```powershell
copy .env.example .env
```

3. Start everything:

```powershell
docker compose up --build
```

4. Open:

- Frontend: http://localhost:3000
- Backend docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

5. Stop services:

```powershell
docker compose down
```

To stop and remove DB volume data as well:

```powershell
docker compose down -v
```

## Important: Run Compose From Correct Directory

Run `docker compose ...` from `bess_app/` (the folder containing `docker-compose.yml`).

If you run it from the parent folder, you may see:

```text
no configuration file provided: not found
```

## Environment Variables

Configured through `.env` (loaded by `docker-compose.yml`).

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `production` | Runtime environment label |
| `FRONTEND_PORT` | `3000` | Host port mapped to frontend |
| `BACKEND_PORT` | `8000` | Host port mapped to backend |
| `POSTGRES_PORT` | `5432` | Host port mapped to postgres |
| `POSTGRES_USER` | `bess_user` | Postgres user |
| `POSTGRES_PASSWORD` | `bess_pass` | Postgres password |
| `POSTGRES_DB` | `bess_db` | Postgres database |
| `DATABASE_URL` | `postgresql://bess_user:bess_pass@postgres:5432/bess_db` | Backend DB connection string |
| `VITE_API_URL` | `http://localhost:8000` | Frontend API base URL |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed origins (comma-separated) |
| `CORS_ALLOW_CREDENTIALS` | `false` | CORS credentials flag |

## Data Storage (PostgreSQL)

The backend creates tables on startup via SQLAlchemy (`Base.metadata.create_all`).

Current schema includes 14 tables:

- `projects`
- `configurations`
- `bom_line_items`
- `component_catalog`
- `suppliers`
- `supplier_components`
- `supplier_scores`
- `scoring_weights`
- `financial_results`
- `cashflow_years`
- `audit_log`
- `calculations` (legacy)
- `bom_items` (legacy)
- `cashflow_years_legacy` (legacy)

Note: the legacy tables are retained for backward compatibility.

### Supplier Rankings Persistence

- Supplier ranking values are stored in Postgres (`suppliers.weighted_score` and historical rows in `supplier_scores`).
- Supplier list/rankings are fetched from Postgres APIs (`/api/suppliers`).
- `seed_data/suppliers.json` is not used as a runtime data source by backend APIs.

## API Summary

Common endpoints:

- `GET /health`
- `POST /api/calculate`
- `GET /api/calculations`
- `GET /api/calculations/{id}`
- `GET /api/bom/{calc_id}`
- `GET /api/suppliers`
- `POST /api/suppliers`
- `POST /api/suppliers/{supplier_id}/score`
- `GET /api/scoring-weights`
- `POST /api/scoring-weights`
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/{project_id}/configurations`

Interactive docs: http://localhost:8000/docs

## Loading Initial Supplier Data (Optional)

If rankings page is empty, your DB likely has no suppliers yet. You can add data via:

- Admin APIs (`/api/admin/suppliers`, `/api/admin/suppliers/bulk-import`)
- UI flows that create suppliers
- Direct SQL insert scripts

## Local Development Without Docker (Optional)

Backend:

```bash
cd backend
pip install -r requirements.txt
set DATABASE_URL=postgresql://bess_user:bess_pass@localhost:5432/bess_db
uvicorn main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Troubleshooting

- Frontend cannot reach backend:
	- Check `VITE_API_URL` in `.env`
	- Ensure backend is healthy at `http://localhost:8000/health`
- CORS errors in browser:
	- Set `CORS_ORIGINS` correctly (exact frontend URL)
- Empty supplier rankings:
	- Confirm `GET /api/suppliers` returns rows
	- If `[]`, import or create suppliers first

## Useful Commands

```powershell
# Rebuild and run
docker compose up --build

# Show service status
docker compose ps

# Tail backend logs
docker compose logs backend --tail 200

# Verify suppliers API quickly
docker compose exec -T backend python -c "import urllib.request; u=urllib.request.urlopen('http://localhost:8000/api/suppliers'); print(u.status); print(u.read().decode()[:1000])"
```
