from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base
import datetime


class Supplier(Base):
    """Enhanced supplier table with certifications"""
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    name = Column(String(200), nullable=False)
    component_category = Column(String(100))
    country = Column(String(100))
    tier = Column(String(50))  # Tier 1, 2, 3
    certifications = Column(JSON)  # ["ISO", "UL", "IEC"] - MySQL compatible
    
    # Scoring fields
    price_score = Column(Float)
    technical_score = Column(Float)
    delivery_score = Column(Float)
    warranty_score = Column(Float)
    support_score = Column(Float)
    certification_score = Column(Float)
    weighted_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    components = relationship("SupplierComponent", back_populates="supplier")
    scores = relationship("SupplierScore", back_populates="supplier")
    bom_line_items = relationship("BOMLineItem", back_populates="selected_supplier")


class SupplierComponent(Base):
    """Link suppliers to BOM components with pricing"""
    __tablename__ = "supplier_components"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    component_catalog_id = Column(Integer, ForeignKey("component_catalog.id"), nullable=False)
    
    moq = Column(Integer)  # Minimum Order Quantity
    unit_cost = Column(Float)
    lead_time_weeks = Column(Integer)
    currency = Column(String(10), default="INR")
    
    supplier = relationship("Supplier", back_populates="components")
    component = relationship("ComponentCatalog", back_populates="suppliers")


class SupplierScore(Base):
    """Supplier scoring with weighted criteria"""
    __tablename__ = "supplier_scores"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    
    # Raw scores (0-100)
    price_score = Column(Float)
    technical_score = Column(Float)
    delivery_score = Column(Float)
    warranty_score = Column(Float)
    support_score = Column(Float)
    certification_score = Column(Float)
    
    # Applied weights
    price_weight = Column(Float)
    technical_weight = Column(Float)
    delivery_weight = Column(Float)
    warranty_weight = Column(Float)
    support_weight = Column(Float)
    cert_weight = Column(Float)
    
    # Weighted final score
    weighted_score = Column(Float)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    
    supplier = relationship("Supplier", back_populates="scores")


class ScoringWeight(Base):
    """User-configurable scoring weights"""
    __tablename__ = "scoring_weights"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(100))  # For multi-user support
    
    price_weight = Column(Float, default=30)
    technical_weight = Column(Float, default=25)
    delivery_weight = Column(Float, default=15)
    warranty_weight = Column(Float, default=10)
    support_weight = Column(Float, default=10)
    cert_weight = Column(Float, default=10)
    
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
