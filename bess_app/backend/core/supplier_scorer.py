"""
Supplier Scorer: weighted scoring logic
"""
from typing import Dict, List


def calculate_supplier_score(
    price_score: float,
    technical_score: float,
    delivery_score: float,
    warranty_score: float,
    support_score: float,
    certification_score: float,
    weights: Dict[str, float],
) -> Dict[str, float]:
    """Calculate weighted supplier score"""
    
    # Ensure weights sum to 100
    total_weight = sum(weights.values())
    if total_weight != 100:
        # Normalize
        weights = {k: v / total_weight * 100 for k, v in weights.items()}
    
    # Calculate weighted score
    weighted = (
        price_score * weights["price"] +
        technical_score * weights["technical"] +
        delivery_score * weights["delivery"] +
        warranty_score * weights["warranty"] +
        support_score * weights["support"] +
        certification_score * weights["cert"]
    ) / 100
    
    return {
        "price_score": round(price_score, 1),
        "technical_score": round(technical_score, 1),
        "delivery_score": round(delivery_score, 1),
        "warranty_score": round(warranty_score, 1),
        "support_score": round(support_score, 1),
        "certification_score": round(certification_score, 1),
        "weighted_score": round(weighted, 1),
        "applied_weights": weights,
    }


def rank_suppliers(suppliers: List[Dict]) -> List[Dict]:
    """Rank suppliers by weighted score"""
    scored = sorted(suppliers, key=lambda x: x.get("weighted_score", 0), reverse=True)
    
    for i, s in enumerate(scored):
        s["rank"] = i + 1
        s["tier"] = "Tier 1" if s["weighted_score"] >= 80 else "Tier 2" if s["weighted_score"] >= 60 else "Tier 3"
    
    return scored


def get_default_weights() -> Dict[str, float]:
    """Get default scoring weights"""
    return {
        "price": 30,
        "technical": 25,
        "delivery": 15,
        "warranty": 10,
        "support": 10,
        "cert": 10,
    }
