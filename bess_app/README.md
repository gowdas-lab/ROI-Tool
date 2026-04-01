# BESS Optimality Tool — Elektron RE
## Sub-MWh Battery Storage Optimisation · FastAPI + PostgreSQL + React

---

## Project Structure

```
bess_app/
├── backend/
│   ├── main.py          ← FastAPI app + all calculation engine
│   ├── models.py        ← SQLAlchemy ORM models (PostgreSQL)
│   ├── crud.py          ← Database read/write operations
│   ├── database.py      ← DB connection config
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── BESSApp.jsx  ← Full React dashboard (9 tabs)
│   │   ├── BESSApp.css  ← Industrial dark theme CSS
│   │   └── main.jsx     ← React entry point
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── Dockerfile
└── docker-compose.yml
```

---

## PostgreSQL Schema (auto-created on startup)

| Table           | Purpose                                              |
|-----------------|------------------------------------------------------|
| calculations    | Full inputs JSON + results JSON + key metrics        |
| bom_items       | Every BOM line item per calculation                  |
| cashflow_years  | Year-by-year degradation-adjusted cash flow          |
| suppliers       | Supplier database with weighted scores               |
| audit_log       | Full audit trail: every CREATE / CALCULATE action    |

---

## Quick Start (Docker — Recommended)

```bash
# 1. Clone / unzip project
cd bess_app

# 2. Start all services
docker compose up --build

# 3. Open browser
# Frontend → http://localhost:3000
# API docs → http://localhost:8000/docs
# PostgreSQL → localhost:5432 (user: bess_user, pass: bess_pass, db: bess_db)
```

---

## Manual Start (Dev Mode)

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set DB URL (or use .env)
export DATABASE_URL=postgresql://bess_user:bess_pass@localhost:5432/bess_db

# Start FastAPI
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# → http://localhost:3000
```

---

## REST API Endpoints

| Method | Endpoint                    | Description                              |
|--------|-----------------------------|------------------------------------------|
| POST   | /api/calculate              | Run full BESS optimisation, store to DB  |
| GET    | /api/calculations           | List all past calculations               |
| GET    | /api/calculations/{id}      | Get full inputs + results for one calc   |
| GET    | /api/bom/{calc_id}          | Get BOM items for a calculation          |
| GET    | /api/suppliers              | List all suppliers                       |
| POST   | /api/suppliers              | Add a new supplier                       |
| GET    | /api/audit                  | Full audit trail log                     |
| GET    | /health                     | Health check                             |

Interactive docs: http://localhost:8000/docs

---

## Frontend Tabs

1. **Inputs** — All configurable parameters (load, battery, solar, savings, DG)
2. **Sizing** — Module count, inverter count, CAPEX breakdown
3. **Cost Analysis** — OPEX, LCOS calculation
4. **ROI & Savings** — Payback, annual savings, year-by-year cashflow
5. **Degradation** — SOH-adjusted cash flow chart + table
6. **Sensitivity** — Payback matrix (BOM × Tariff) + LCOS matrix (DoD × Cycles)
7. **BOM** — Full Bill of Materials with category filter
8. **Comparison** — BESS vs Solar vs DG vs BESS+Solar LCOS comparison
9. **History** — Load and compare past calculations from PostgreSQL

---

## What Gets Stored in PostgreSQL

Every time you click "Run Optimisation":
- Complete input parameters (JSON)
- Complete results (JSON) 
- All BOM line items (separate rows)
- Year-by-year cashflow (separate rows)
- Audit log entry

---

## Environment Variables

| Variable     | Default                                           |
|--------------|---------------------------------------------------|
| DATABASE_URL | postgresql://bess_user:bess_pass@localhost/bess_db|

---

Elektron RE · Mysuru, Karnataka · 2026
