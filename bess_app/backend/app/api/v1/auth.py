import os
from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db
from models import User
import bcrypt
import hashlib
import hmac
import secrets
import time

router = APIRouter(prefix="/auth", tags=["auth"])

TOKEN_SECRET = os.getenv("AUTH_TOKEN_SECRET", "bess-dev-token-secret-change-me")
TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60  # 7 days


def get_current_user_modular(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    """Validate Bearer token and return current user"""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth token")
    
    token = authorization.split(" ", 1)[1].strip()

    try:
        payload, signature = token.rsplit(".", 1)
        expected_sig = hmac.new(TOKEN_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            raise HTTPException(status_code=401, detail="Invalid token signature")

        user_id_str, issued_at_str, _nonce = payload.split(":", 2)
        issued_at = int(issued_at_str)

        if int(time.time()) - issued_at > TOKEN_TTL_SECONDS:
            raise HTTPException(status_code=401, detail="Token expired")

        user = db.query(User).filter(User.id == int(user_id_str)).first()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")

        return user
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


def generate_token(user_id: int) -> str:
    """Generate a token compatible with main.py _parse_access_token"""
    issued_at = str(int(time.time()))
    nonce = secrets.token_hex(8)
    payload = f"{user_id}:{issued_at}:{nonce}"
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


# Schemas
class UserSignup(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: str | None = None


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: str | None
    is_active: bool
    is_admin: bool
    role: str = "user"

    class Config:
        from_attributes = True


class SignupResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Helper functions
def normalize_password(password: str) -> str:
    """Pre-hash password to handle bcrypt's 72 byte limit"""
    if len(password.encode("utf-8")) > 72:
        return hashlib.sha256(password.encode('utf-8')).hexdigest()
    return password


def get_password_hash(password: str) -> str:
    normalized = normalize_password(password)
    return bcrypt.hashpw(normalized.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    normalized = normalize_password(plain_password)
    try:
        return bcrypt.checkpw(normalized.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


# Endpoints
@router.post("/signup", response_model=SignupResponse)
def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    # Check if email exists
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Check if username exists
    if db.query(User).filter(User.username == user_data.username).first():
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Auto-assign admin role for @elektronre.com emails
    is_admin = user_data.email.lower().endswith("@elektronre.com")
    role = "admin" if is_admin else "user"
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        full_name=user_data.full_name,
        hashed_password=hashed_password,
        role=role,
        is_active=True,
        is_admin=is_admin
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return SignupResponse(
        access_token=generate_token(new_user.id),
        token_type="bearer",
        user=new_user
    )


@router.post("/login", response_model=LoginResponse)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Find user by email
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")
    
    return LoginResponse(
        access_token=generate_token(user.id),
        token_type="bearer",
        user=user
    )


@router.get("/me", response_model=UserResponse)
def get_current_user(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
