from sqlalchemy import Column, Integer, Float, String, DateTime, Text, JSON
from database import Base
import datetime


class AuditLog(Base):
    """Full audit trail for BOM and supplier changes"""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(String(100))
    action = Column(String(50))  # CREATE, UPDATE, DELETE, CALCULATE
    entity_type = Column(String(50))  # Project, BOM, Supplier, etc.
    entity_id = Column(Integer)
    changes = Column(JSON)  # Field-level changes
    notes = Column(Text)


# Legacy models for backward compatibility
class Calculation(Base):
    """Legacy calculation table"""
    __tablename__ = "calculations"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    use_case = Column(String(100))
    inputs = Column(JSON)
    results = Column(JSON)


class BOMItem(Base):
    """Legacy BOM items table"""
    __tablename__ = "bom_items"

    id = Column(Integer, primary_key=True, index=True)
    calculation_id = Column(Integer)
    category = Column(String(100))
    description = Column(String(300))
    qty = Column(Float)
    unit = Column(String(50))
    spec = Column(String(300))
    unit_price = Column(Float)
    line_total = Column(Float)


class CashflowYearLegacy(Base):
    """Legacy cashflow table"""
    __tablename__ = "cashflow_years_legacy"

    id = Column(Integer, primary_key=True, index=True)
    calculation_id = Column(Integer)
    year = Column(Integer)
    soh_pct = Column(Float)
    throughput_kwh = Column(Float)
    opex = Column(Float)
    savings = Column(Float)
    net = Column(Float)
    cumulative_net = Column(Float)
