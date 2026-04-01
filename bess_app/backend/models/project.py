from sqlalchemy import Column, Integer, Float, String, JSON, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Project(Base):
    """Main project table - stores energy inputs and use case"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    name = Column(String(200))
    use_case = Column(String(200))
    
    # Load Profile
    peak_demand_kw = Column(Float)
    daily_energy_kwh = Column(Float)
    num_sites = Column(Integer)
    backup_duration_hrs = Column(Float)
    grid_peak_tariff = Column(Float)
    grid_offpeak_tariff = Column(Float)
    cycles_per_day = Column(Float)
    project_lifetime_yrs = Column(Float)
    
    # Battery
    dod_pct = Column(Float)
    battery_module_kwh = Column(Float)
    cycle_life = Column(Integer)
    round_trip_efficiency_pct = Column(Float)
    
    # Solar
    solar_pv_kwp = Column(Float)
    solar_cuf_pct = Column(Float)
    
    # Inputs JSON for flexibility
    inputs_json = Column(JSON)
    
    configurations = relationship("Configuration", back_populates="project")
    financial_results = relationship("FinancialResult", back_populates="project")
    bom_items = relationship("BOMLineItem", back_populates="project")
