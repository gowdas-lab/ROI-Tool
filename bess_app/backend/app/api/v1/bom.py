"""
API Routes: BOM
POST /bom/generate, GET /bom/{id}
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import BOMLineItem, Project, Configuration
from schemas import BomItemResponse
from core import build_bom, get_bom_summary

router = APIRouter()


@router.post("/generate")
def generate_bom(project_id: int, configuration_id: int, db: Session = Depends(get_db)):
    """Generate BOM for a configuration"""
    project = db.query(Project).filter(Project.id == project_id).first()
    config = db.query(Configuration).filter(Configuration.id == configuration_id).first()
    
    if not project or not config:
        raise HTTPException(status_code=404, detail="Project or configuration not found")
    
    # Build BOM
    bom_items = build_bom(
        num_modules=config.num_modules,
        module_kwh=config.module_kwh,
        num_inverters=config.num_inverters,
        inverter_kw=config.inverter_kw,
        use_case=project.use_case,
    )
    
    # Save to database
    for item in bom_items:
        db_item = BOMLineItem(
            project_id=project_id,
            configuration_id=configuration_id,
            category=item["category"],
            description=item["description"],
            qty=item["qty"],
            unit=item["unit"],
            spec=item["spec"],
            unit_price=item["unit_price"],
            line_total=item["line_total"],
        )
        db.add(db_item)
    
    db.commit()
    
    summary = get_bom_summary(bom_items)
    
    return {"items": bom_items, "summary": summary}


@router.get("/{project_id}", response_model=List[BomItemResponse])
def get_bom(project_id: int, db: Session = Depends(get_db)):
    """Get BOM for a project"""
    items = db.query(BOMLineItem).filter(BOMLineItem.project_id == project_id).all()
    return items
