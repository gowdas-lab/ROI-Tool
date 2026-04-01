"""
API Routes: Suppliers
CRUD for supplier DB
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Supplier, SupplierScore, ScoringWeight
from schemas import SupplierCreate, SupplierResponse, SupplierScoreRequest
from core import calculate_supplier_score, get_default_weights

router = APIRouter()


@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(db: Session = Depends(get_db)):
    """List all suppliers"""
    return db.query(Supplier).order_by(Supplier.weighted_score.desc()).all()


@router.post("/", response_model=SupplierResponse)
def create_supplier(data: SupplierCreate, db: Session = Depends(get_db)):
    """Add a new supplier"""
    supplier = Supplier(**data.dict())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(supplier_id: int, db: Session = Depends(get_db)):
    """Get supplier by ID"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.post("/{supplier_id}/score")
def score_supplier(supplier_id: int, data: SupplierScoreRequest, db: Session = Depends(get_db)):
    """Score a supplier with weighted criteria"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    # Calculate weighted score
    result = calculate_supplier_score(
        price_score=data.price_score,
        technical_score=data.technical_score,
        delivery_score=data.delivery_score,
        warranty_score=data.warranty_score,
        support_score=data.support_score,
        certification_score=data.certification_score,
        weights=data.weights.dict(),
    )
    
    # Update supplier scores
    supplier.price_score = result["price_score"]
    supplier.technical_score = result["technical_score"]
    supplier.delivery_score = result["delivery_score"]
    supplier.warranty_score = result["warranty_score"]
    supplier.support_score = result["support_score"]
    supplier.certification_score = result["certification_score"]
    supplier.weighted_score = result["weighted_score"]
    
    # Save score record
    score_record = SupplierScore(
        supplier_id=supplier_id,
        **result,
        **{f"{k}_weight": v for k, v in data.weights.dict().items()},
    )
    db.add(score_record)
    db.commit()
    
    return result
