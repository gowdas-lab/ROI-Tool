"""
Celery async jobs (heavy permutations)
"""
from celery import Celery
import os

# Configure Celery with Redis
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("bess_tasks", broker=redis_url, backend=redis_url)


@celery_app.task
def run_permutations_async(project_id: int, module_options: list = None, inverter_options: list = None):
    """Run heavy permutations in background"""
    from core import generate_configurations, calculate_sizing
    from database import SessionLocal
    from models import Project, Configuration
    
    db = SessionLocal()
    try:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            return {"error": "Project not found"}
        
        sizing = calculate_sizing(
            daily_energy_kwh=project.daily_energy_kwh,
            backup_duration_hrs=project.backup_duration_hrs,
            dod_pct=project.dod_pct,
            battery_module_kwh=project.battery_module_kwh,
            peak_demand_kw=project.peak_demand_kw,
        )
        
        configs = generate_configurations(
            req_energy_kwh=sizing["req_energy_kwh"],
            req_power_kw=sizing["req_power_kw"],
            module_options=module_options,
            inverter_options=inverter_options,
        )
        
        for config in configs:
            db_config = Configuration(project_id=project_id, **config)
            db.add(db_config)
        
        db.commit()
        return {"status": "complete", "config_count": len(configs)}
    finally:
        db.close()


@celery_app.task
def generate_export_async(project_id: int, export_format: str = "excel"):
    """Generate BOM export in background"""
    from core import build_bom, get_bom_summary
    from database import SessionLocal
    from models import Project, Configuration
    
    db = SessionLocal()
    try:
        config = db.query(Configuration).filter(Configuration.project_id == project_id).first()
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not config or not project:
            return {"error": "Not found"}
        
        bom = build_bom(
            num_modules=config.num_modules,
            module_kwh=config.module_kwh,
            num_inverters=config.num_inverters,
            inverter_kw=config.inverter_kw,
        )
        
        summary = get_bom_summary(bom)
        
        # TODO: Generate actual Excel/PDF file
        return {
            "status": "complete",
            "format": export_format,
            "items": len(bom),
            "total": summary["total_bom"],
        }
    finally:
        db.close()
