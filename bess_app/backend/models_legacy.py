from sqlalchemy import Column, Integer, Float, String, JSON, DateTime, Text, ForeignKey, Boolean
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


class Configuration(Base):
    """Permutation results - ranked module/inverter combos"""
    __tablename__ = "configurations"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    # Configuration specs
    num_modules = Column(Integer)
    module_kwh = Column(Float)
    total_kwh = Column(Float)
    num_inverters = Column(Integer)
    inverter_kw = Column(Float)
    total_kw = Column(Float)
    
    # Scores
    efficiency_score = Column(Float)  # 0-100
    cost_score = Column(Float)  # 0-100
    overall_score = Column(Float)  # weighted combination
    is_recommended = Column(Boolean, default=False)
    rank = Column(Integer)
    
    project = relationship("Project", back_populates="configurations")
    financial_result = relationship("FinancialResult", back_populates="configuration", uselist=False)


class BOMLineItem(Base):
    """Detailed BOM with supplier linking"""
    __tablename__ = "bom_line_items"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=True)
    
    bom_item_id = Column(Integer)
    category = Column(String(100))
    description = Column(String(300))
    qty = Column(Float)
    unit = Column(String(50))
    spec = Column(String(300))
    unit_price = Column(Float)
    line_total = Column(Float)
    
    # Supplier linking
    selected_supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=True)
    
    project = relationship("Project", back_populates="bom_items")
    selected_supplier = relationship("Supplier", back_populates="bom_line_items")


class ComponentCatalog(Base):
    """Component specifications catalog"""
    __tablename__ = "component_catalog"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(100))  # Battery, Inverter, MCB, etc.
    name = Column(String(200))
    description = Column(String(500))
    
    # Electrical specs
    voltage_min = Column(Float)
    voltage_max = Column(Float)
    current_rating = Column(Float)
    power_rating = Column(Float)
    
    # Physical specs
    ip_rating = Column(String(20))  # IP65, IP66, etc.
    dimensions = Column(String(100))
    weight_kg = Column(Float)
    
    # Performance specs
    spec_rating = Column(Float)  # generic spec score
    efficiency_pct = Column(Float)
    cycle_life = Column(Integer)
    warranty_yrs = Column(Integer)
    
    # Standard price reference
    base_price = Column(Float)
    currency = Column(String(10), default="INR")
    
    is_active = Column(Boolean, default=True)


class Supplier(Base):
    """Supplier information with tier and certifications"""
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    name = Column(String(200), nullable=False)
    country = Column(String(100))
    tier = Column(String(50))  # Tier 1, Tier 2, etc.
    certifications = Column(JSON)  # ISO, IEC, etc.
    url = Column(Text)
    contact_email = Column(String(200))
    notes = Column(Text)
    is_active = Column(Boolean, default=True)
    
    bom_line_items = relationship("BOMLineItem", back_populates="selected_supplier")
    supplier_components = relationship("SupplierComponent", back_populates="supplier")
    scores = relationship("SupplierScore", back_populates="supplier")


class SupplierComponent(Base):
    """Supplier offerings for specific components"""
    __tablename__ = "supplier_components"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    catalog_id = Column(Integer, ForeignKey("component_catalog.id"), nullable=False)
    
    # Supplier-specific offering
    model_number = Column(String(200))
    unit_price = Column(Float)
    moq = Column(Integer)  # Minimum order quantity
    lead_time_days = Column(Integer)
    warranty_yrs = Column(Integer)
    is_preferred = Column(Boolean, default=False)
    
    supplier = relationship("Supplier", back_populates="supplier_components")


class SupplierScore(Base):
    """Detailed supplier scoring per component category"""
    __tablename__ = "supplier_scores"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    component_category = Column(String(100))
    
    # Individual scores (0-100)
    price_score = Column(Float)
    technical_score = Column(Float)
    delivery_score = Column(Float)
    warranty_score = Column(Float)
    support_score = Column(Float)
    cert_score = Column(Float)
    
    # Weighted calculation
    weighted_score = Column(Float)
    
    supplier = relationship("Supplier", back_populates="scores")


class ScoringWeight(Base):
    """User-configurable scoring weights"""
    __tablename__ = "scoring_weights"

    id = Column(Integer, primary_key=True, index=True)
    component_category = Column(String(100))
    criterion = Column(String(50))  # price, technical, delivery, warranty, support, cert
    weight_pct = Column(Float)  # percentage weight
    is_default = Column(Boolean, default=False)


class FinancialResult(Base):
    """Calculated financial results per configuration"""
    __tablename__ = "financial_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=False, unique=True)
    
    # CAPEX
    total_capex = Column(Float)
    bom_cost = Column(Float)
    installation_cost = Column(Float)
    commissioning_cost = Column(Float)
    
    # OPEX
    annual_opex = Column(Float)
    lifetime_opex = Column(Float)
    
    # Key metrics
    lcos = Column(Float)
    roi_pct = Column(Float)
    payback_yrs = Column(Float)
    npv = Column(Float, nullable=True)
    
    # Annual savings breakdown
    annual_arbitrage = Column(Float)
    annual_md_saving = Column(Float)
    dg_displacement = Column(Float)
    total_annual_savings = Column(Float)
    
    project = relationship("Project", back_populates="financial_results")
    configuration = relationship("Configuration", back_populates="financial_result")


class CashflowYear(Base):
    """Year-by-year cashflow for each configuration"""
    __tablename__ = "cashflow_years"

    id = Column(Integer, primary_key=True, index=True)
    financial_result_id = Column(Integer, ForeignKey("financial_results.id"), nullable=False)
    year = Column(Integer)
    soh_pct = Column(Float)
    usable_capacity_kwh = Column(Float)
    arbitrage_saving = Column(Float)
    md_dg_saving = Column(Float)
    total_saving = Column(Float)
    net_benefit = Column(Float)
    cumulative_net = Column(Float)


class AuditLog(Base):
    """Full audit trail"""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    action = Column(String(50))  # CREATE, UPDATE, DELETE, CALCULATE
    table_name = Column(String(100))
    record_id = Column(Integer)
    user_id = Column(String(100), nullable=True)
    details = Column(JSON)


# Legacy table for backward compatibility
class Calculation(Base):
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    use_case = Column(String(200))
    total_capex = Column(Float)
    lcos = Column(Float)
    payback_yrs = Column(Float)
    num_modules = Column(Integer)
    actual_kwh = Column(Float)
    total_annual_savings = Column(Float)
    inputs_json = Column(JSON)
    results_json = Column(JSON)
