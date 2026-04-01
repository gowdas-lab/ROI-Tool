from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base
import datetime


class FinancialResult(Base):
    """Calculated results: CAPEX, OPEX, ROI, LCOS"""
    __tablename__ = "financial_results"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False)
    configuration_id = Column(Integer, ForeignKey("configurations.id"), nullable=True)
    
    # CAPEX
    battery_cost = Column(Float)
    inverter_cost = Column(Float)
    solar_cost = Column(Float)
    bms_cost = Column(Float)
    installation_cost = Column(Float)
    commissioning_cost = Column(Float)
    contingency_cost = Column(Float)
    total_capex = Column(Float)
    
    # OPEX
    annual_battery_om = Column(Float)
    annual_inverter_om = Column(Float)
    annual_solar_om = Column(Float)
    total_annual_opex = Column(Float)
    
    # LCOS
    lcos_inr_per_kwh = Column(Float)
    lcos_pv_adjusted = Column(Float)
    energy_throughput_kwh = Column(Float)
    lifetime_cost = Column(Float)
    
    # Savings
    annual_arbitrage = Column(Float)
    annual_md_saving = Column(Float)
    dg_displacement = Column(Float)
    total_annual_savings = Column(Float)
    
    # ROI
    net_annual_benefit = Column(Float)
    simple_payback_yrs = Column(Float)
    roi_10yr_pct = Column(Float)
    npv_8pct = Column(Float)
    irr_pct = Column(Float)
    cumulative_10yr_net = Column(Float)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    project = relationship("Project", back_populates="financial_results")
    configuration = relationship("Configuration", back_populates="financial_result")


class CashflowYear(Base):
    """Year-by-year degradation tracking"""
    __tablename__ = "cashflow_years"

    id = Column(Integer, primary_key=True, index=True)
    financial_result_id = Column(Integer, ForeignKey("financial_results.id"), nullable=False)
    year = Column(Integer)
    soh_pct = Column(Float)  # State of Health
    throughput_kwh = Column(Float)
    opex = Column(Float)
    savings = Column(Float)
    net = Column(Float)
    cumulative_net = Column(Float)
