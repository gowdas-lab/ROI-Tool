"""
Admin API endpoints for BOM and Supplier management
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import ComponentCatalog, Supplier
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(tags=["admin"])


def require_admin(x_user_role: str | None = Header(default=None, alias="X-User-Role")):
    if x_user_role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")

# ─── BOM (Component Catalog) Schemas ─────────────────────────────────────────

class ComponentCatalogCreate(BaseModel):
    bom_number: int | None = None
    category: str
    subcategory: str | None = None
    description: str
    spec: str | None = None
    notes: str | None = None
    qty_formula: str | None = "1"
    unit: str | None = "pcs"
    unit_price: float | None = 0
    rated_voltage_v: float | None = None
    rated_current_a: float | None = None
    rated_power_kw: float | None = None
    capacity_kwh: float | None = None
    dimensions_mm: str | None = None
    weight_kg: float | None = None
    ip_rating: str | None = None
    certifications: str | None = None
    warranty_years: int | None = None
    standard: str | None = None

class ComponentCatalogResponse(ComponentCatalogCreate):
    id: int
    
    class Config:
        from_attributes = True

# ─── Supplier Schemas ────────────────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    component_category: str | None = None
    country: str | None = None
    tier: str | None = None  # Tier-1, Indian OEM, OEM/EMS
    certifications: list[str] | None = None
    # Scoring fields
    price_score: float | None = None
    technical_score: float | None = None
    delivery_score: float | None = None
    warranty_score: float | None = None
    support_score: float | None = None
    certification_score: float | None = None
    weighted_score: float | None = None

class SupplierResponse(SupplierCreate):
    id: int
    created_at: datetime | None = None
    
    class Config:
        from_attributes = True

# ─── BOM CRUD Endpoints ─────────────────────────────────────────────────────

@router.get("/bom", response_model=List[ComponentCatalogResponse])
def get_all_bom_items(db: Session = Depends(get_db)):
    """Get all BOM items from component catalog — readable by all users"""
    return db.query(ComponentCatalog).all()

@router.post("/bom", response_model=ComponentCatalogResponse)
def create_bom_item(item: ComponentCatalogCreate, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Create new BOM item"""
    db_item = ComponentCatalog(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/bom/{item_id}", response_model=ComponentCatalogResponse)
def update_bom_item(item_id: int, item: ComponentCatalogCreate, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Update existing BOM item"""
    db_item = db.query(ComponentCatalog).filter(ComponentCatalog.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    
    for key, value in item.dict().items():
        setattr(db_item, key, value)
    
    db.commit()
    db.refresh(db_item)
    return db_item

@router.delete("/bom/{item_id}")
def delete_bom_item(item_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Delete BOM item"""
    db_item = db.query(ComponentCatalog).filter(ComponentCatalog.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="BOM item not found")
    
    db.delete(db_item)
    db.commit()
    return {"message": "BOM item deleted"}

# ─── Supplier CRUD Endpoints ────────────────────────────────────────────────

@router.get("/suppliers", response_model=List[SupplierResponse])
def get_all_suppliers(db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Get all suppliers"""
    return db.query(Supplier).all()

@router.post("/suppliers", response_model=SupplierResponse)
def create_supplier(supplier: SupplierCreate, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Create new supplier"""
    db_supplier = Supplier(**supplier.dict())
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.put("/suppliers/{supplier_id}", response_model=SupplierResponse)
def update_supplier(supplier_id: int, supplier: SupplierCreate, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Update existing supplier"""
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    for key, value in supplier.dict().items():
        setattr(db_supplier, key, value)
    
    db.commit()
    db.refresh(db_supplier)
    return db_supplier

@router.delete("/suppliers/{supplier_id}")
def delete_supplier(supplier_id: int, db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Delete supplier"""
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(db_supplier)
    db.commit()
    return {"message": "Supplier deleted"}

# ─── Bulk Import Endpoints ───────────────────────────────────────────────────

@router.post("/bom/bulk-import")
def bulk_import_bom(items: List[ComponentCatalogCreate], db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Bulk import BOM items (for admin panel CSV/JSON import)"""
    db_items = [ComponentCatalog(**item.dict()) for item in items]
    db.add_all(db_items)
    db.commit()
    return {"message": f"Imported {len(db_items)} BOM items"}

@router.post("/suppliers/bulk-import")
def bulk_import_suppliers(suppliers: List[SupplierCreate], db: Session = Depends(get_db), _: None = Depends(require_admin)):
    """Bulk import suppliers"""
    db_suppliers = [Supplier(**s.dict()) for s in suppliers]
    db.add_all(db_suppliers)
    db.commit()
    return {"message": f"Imported {len(db_suppliers)} suppliers"}
