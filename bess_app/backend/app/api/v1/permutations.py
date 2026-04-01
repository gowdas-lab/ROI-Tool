"""
API Routes: Permutations
POST /permutations/run
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Project, Configuration
from core import generate_configurations, calculate_sizing

router = APIRouter()


@router.post("/run/{project_id}")
def run_permutations(project_id: int, db: Session = Depends(get_db)):
    """Generate configuration permutations for a project"""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get sizing
    sizing = calculate_sizing(
        daily_energy_kwh=project.daily_energy_kwh,
        backup_duration_hrs=project.backup_duration_hrs,
        dod_pct=project.dod_pct,
        battery_module_kwh=project.battery_module_kwh,
        peak_demand_kw=project.peak_demand_kw,
    )
    
    # Generate configurations
    configs = generate_configurations(
        req_energy_kwh=sizing["req_energy_kwh"],
        req_power_kw=sizing["req_power_kw"],
    )
    
    # Save to database
    db_configs = []
    for config in configs:
        db_config = Configuration(
            project_id=project_id,
            **config,
        )
        db.add(db_config)
        db_configs.append(config)
    
    db.commit()
    
    return {
        "sizing": sizing,
        "configurations": db_configs,
    }


@router.get("/projects/{project_id}/configurations")
def get_configurations(project_id: int, db: Session = Depends(get_db)):
    """Get configurations for a project"""
    configs = db.query(Configuration).filter(Configuration.project_id == project_id).order_by(Configuration.rank).all()
    return configs
