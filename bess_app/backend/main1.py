from fastapi import FastAPI
from pydantic import BaseModel
from sqlalchemy import text
from database import engine

app = FastAPI()

# ✅ Request Model (for Swagger input)
class ProjectCreate(BaseModel):
    name: str
    use_case: str
    peak_demand_kw: float = 0
    daily_energy_kwh: float = 0
    num_sites: int = 1
    backup_duration_hrs: float = 0
    grid_peak_tariff: float = 0
    grid_offpeak_tariff: float = 0
    cycles_per_day: float = 0
    project_lifetime_yrs: int = 0
    dod_pct: float = 0
    battery_module_kwh: float = 0
    cycle_life: int = 0
    round_trip_efficiency_pct: float = 0
    solar_pv_kwp: float = 0
    solar_cuf_pct: float = 19


# ✅ Root endpoint
@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}


# ✅ GET all projects
@app.get("/api/projects/")
def get_projects():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM projects"))
        return [dict(row._mapping) for row in result]


# ✅ GET single project
@app.get("/api/projects/{project_id}")
def get_project(project_id: int):
    with engine.connect() as conn:
        result = conn.execute(
            text("SELECT * FROM projects WHERE id = :id"),
            {"id": project_id}
        ).fetchone()

        if result:
            return dict(result._mapping)
        return {"error": "Project not found"}


# ✅ POST create project (NOW TAKES JSON INPUT)
@app.post("/api/projects/")
def create_project(project: ProjectCreate):
    with engine.connect() as conn:
        conn.execute(
            text("""
                INSERT INTO projects (
                    name, use_case,
                    peak_demand_kw, daily_energy_kwh,
                    num_sites, backup_duration_hrs,
                    grid_peak_tariff, grid_offpeak_tariff,
                    cycles_per_day, project_lifetime_yrs,
                    dod_pct, battery_module_kwh,
                    cycle_life, round_trip_efficiency_pct,
                    solar_pv_kwp, solar_cuf_pct
                )
                VALUES (
                    :name, :use_case,
                    :peak_demand_kw, :daily_energy_kwh,
                    :num_sites, :backup_duration_hrs,
                    :grid_peak_tariff, :grid_offpeak_tariff,
                    :cycles_per_day, :project_lifetime_yrs,
                    :dod_pct, :battery_module_kwh,
                    :cycle_life, :round_trip_efficiency_pct,
                    :solar_pv_kwp, :solar_cuf_pct
                )
            """),
            project.dict()
        )
        conn.commit()

    return {"message": "Project created successfully ✅"}