from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from database import Base
import datetime


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
