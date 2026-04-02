from sqlalchemy import Column, Integer, String, DateTime
from database import Base
import datetime


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(200), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    role = Column(String(20), default="user")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
