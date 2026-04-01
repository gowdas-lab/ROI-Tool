from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base
import datetime


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
