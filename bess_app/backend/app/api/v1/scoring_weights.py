"""
API Routes: Scoring Weights
GET/POST scoring weights
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ScoringWeight
from schemas import ScoringWeights
from core import get_default_weights

router = APIRouter()


@router.get("/")
def get_weights(db: Session = Depends(get_db)):
    """Get current scoring weights"""
    weights = db.query(ScoringWeight).order_by(ScoringWeight.updated_at.desc()).first()
    
    if not weights:
        # Return defaults
        return {"weights": get_default_weights()}
    
    return {
        "weights": {
            "price": weights.price_weight,
            "technical": weights.technical_weight,
            "delivery": weights.delivery_weight,
            "warranty": weights.warranty_weight,
            "support": weights.support_weight,
            "cert": weights.cert_weight,
        }
    }


@router.post("/")
def save_weights(data: ScoringWeights, db: Session = Depends(get_db)):
    """Save scoring weights"""
    weights = ScoringWeight(
        price_weight=data.price,
        technical_weight=data.technical,
        delivery_weight=data.delivery,
        warranty_weight=data.warranty,
        support_weight=data.support,
        cert_weight=data.cert,
    )
    db.add(weights)
    db.commit()
    
    return {"weights": data.dict()}
