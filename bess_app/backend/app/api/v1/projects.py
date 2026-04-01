"""
API Routes: Projects
POST /projects, GET /projects/{id}
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Project
from schemas import ProjectCreate, ProjectResponse

router = APIRouter()


@router.post("/", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db)):
    """Create a new project"""
    project = Project(
        name=data.name,
        use_case=data.use_case,
        peak_demand_kw=data.peak_demand_kw,
        daily_energy_kwh=data.daily_energy_kwh,
        num_sites=data.num_sites,
        backup_duration_hrs=data.backup_duration_hrs,
        grid_peak_tariff=data.grid_peak_tariff,
        grid_offpeak_tariff=data.grid_offpeak_tariff,
        cycles_per_day=data.cycles_per_day,
        project_lifetime_yrs=data.project_lifetime_yrs,
        dod_pct=data.dod_pct,
        battery_module_kwh=data.battery_module_kwh,
        cycle_life=data.cycle_life,
        round_trip_efficiency_pct=data.round_trip_efficiency_pct,
        solar_pv_kwp=data.solar_pv_kwp,
        solar_cuf_pct=data.solar_cuf_pct,
        inputs_json=data.dict(),
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/", response_model=List[ProjectResponse])
def list_projects(db: Session = Depends(get_db)):
    """List all projects"""
    return db.query(Project).order_by(Project.created_at.desc()).all()


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db)):
    """Get project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
