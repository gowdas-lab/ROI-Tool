from sqlalchemy import Column, Integer, Float, String, DateTime, Text
from sqlalchemy.orm import relationship
from database import Base


class ComponentCatalog(Base):
    """Component specifications catalog - mirrors BOM Catalogue from Sheet 6"""
    __tablename__ = "component_catalog"

    id = Column(Integer, primary_key=True, index=True)
    
    # BOM identification
    bom_number = Column(Integer, unique=True)
    category = Column(String(100))  # BATTERY SYSTEM, AC SIDE, etc.
    subcategory = Column(String(100))  # LFP, NMC, etc.
    
    # Description and specs
    description = Column(String(300))
    spec = Column(String(300))  # Technical specification
    notes = Column(Text)  # Detailed notes
    
    # Quantity calculation
    qty_formula = Column(String(100), default="1")  # e.g., "n", "inv", "inv*3"
    unit = Column(String(50))  # system, pcs, m, set, service
    
    # Pricing
    unit_price = Column(Float, default=0)  # INR
    
    # Technical specifications (optional)
    rated_voltage_v = Column(Float)
    rated_current_a = Column(Float)
    rated_power_kw = Column(Float)
    capacity_kwh = Column(Float)
    
    # Physical (optional)
    dimensions_mm = Column(String(100))
    weight_kg = Column(Float)
    ip_rating = Column(String(20))
    
    # Certifications and warranty
    certifications = Column(String(200))  # Comma-separated
    warranty_years = Column(Integer)
    standard = Column(String(100))  # IEC, UL, etc.
    
    suppliers = relationship("SupplierComponent", back_populates="component")
