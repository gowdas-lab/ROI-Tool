"""
API Routes: Projects
POST /projects, GET /projects/{id}
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Project, User
from schemas import ProjectCreate, ProjectResponse
from app.api.v1.auth import get_current_user_modular

router = APIRouter()


@router.post("/", response_model=ProjectResponse)
def create_project(data: ProjectCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_modular)):
    """Create a new project"""
    project = Project(
        user_id=current_user.id,
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
        cycle_life=int(data.cycle_life),
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
def list_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user_modular)):
    """List projects belonging to the current user (admin sees all)"""
    q = db.query(Project)
    if current_user.role != "admin":
        q = q.filter(Project.user_id == current_user.id)
    return q.order_by(Project.created_at.desc()).all()


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user_modular)):
    """Get project by ID"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed")
    return project
