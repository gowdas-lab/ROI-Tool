from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    use_case: str
    peak_demand_kw: float
    daily_energy_kwh: float
    num_sites: int = 1
    backup_duration_hrs: float
    grid_peak_tariff: float
    grid_offpeak_tariff: float
    cycles_per_day: float
    project_lifetime_yrs: float
    dod_pct: float
    battery_module_kwh: float
    cycle_life: int
    round_trip_efficiency_pct: float
    solar_pv_kwp: float = 0
    solar_cuf_pct: float = 19


class ProjectResponse(BaseModel):
    id: int
    name: str
    use_case: str
    created_at: datetime
    
    class Config:
        from_attributes = True


class ConfigurationResponse(BaseModel):
    id: int
    project_id: int
    rank: int
    num_modules: int
    module_kwh: float
    total_kwh: float
    num_inverters: int
    inverter_kw: float
    total_kw: float
    efficiency_score: float
    cost_score: float
    overall_score: float
    is_recommended: bool
    
    class Config:
        from_attributes = True


class BomItemResponse(BaseModel):
    id: int
    category: str
    description: str
    qty: float
    unit: str
    spec: str
    unit_price: float
    line_total: float
    supplier_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class SupplierResponse(BaseModel):
    id: int
    name: str
    component_category: str
    country: str
    tier: str
    certifications: List[str]
    price_score: Optional[float]
    technical_score: Optional[float]
    delivery_score: Optional[float]
    weighted_score: Optional[float]
    
    class Config:
        from_attributes = True


class SupplierCreate(BaseModel):
    name: str
    component_category: str
    country: str = "India"
    tier: str = "Tier 2"
    certifications: List[str] = []


class ScoringWeights(BaseModel):
    price: float = 30
    technical: float = 25
    delivery: float = 15
    warranty: float = 10
    support: float = 10
    cert: float = 10


class SupplierScoreRequest(BaseModel):
    price_score: float
    technical_score: float
    delivery_score: float
    warranty_score: float
    support_score: float
    certification_score: float
    weights: ScoringWeights


class CalculationResponse(BaseModel):
    id: int
    timestamp: datetime
    use_case: str
    total_capex: float
    lcos: float
    payback_yrs: float
    
    class Config:
        from_attributes = True
