"""
BESS Optimality API - FastAPI entry point
Modular API routes with core calculation engines
"""
import os
import math
import hashlib
import secrets
import bcrypt
import hmac
import time
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from database import get_db, engine, Base, SessionLocal
from sqlalchemy.orm import Session
from sqlalchemy import text
import crud
import models

# Import API routes
from app.api.v1 import router as api_router
from app.api.v1.auth import TOKEN_SECRET as AUTH_TOKEN_SECRET

# Use consistent token secret from auth module
TOKEN_SECRET = AUTH_TOKEN_SECRET

# Create tables
Base.metadata.create_all(bind=engine)


def run_lightweight_migrations():
    statements = [
        "ALTER TABLE calculations ADD COLUMN IF NOT EXISTS user_id INTEGER",
        "ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id INTEGER",
        "ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS user_id INTEGER",
    ]
    with engine.begin() as conn:
        for stmt in statements:
            conn.execute(text(stmt))


run_lightweight_migrations()

TEMP_ADMIN_EMAIL = "admin-bess-app@temp-mail.com"
TEMP_ADMIN_PASSWORD = "12345admin"
# TOKEN_SECRET is imported from app.api.v1.auth (line 24-27)
TOKEN_TTL_SECONDS = int(os.getenv("AUTH_TOKEN_TTL_SECONDS", str(7 * 24 * 60 * 60)))

# FastAPI app
app = FastAPI(
    title="BESS Optimality API",
    version="2.0.0",
    description="Battery Energy Storage System optimization with permutation engine and supplier scoring"
)

cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]
if not cors_origins:
    cors_origins = ["http://localhost:3000"]

cors_allow_credentials = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() == "true"

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=cors_allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modular API routes
app.include_router(api_router, prefix="/api")


class SignUpPayload(BaseModel):
    email: str
    password: str


class AdminSignUpPayload(BaseModel):
    email: str
    password: str


class LoginPayload(BaseModel):
    email: str
    password: str


def _normalize_password(password: str) -> str:
    """Handle bcrypt's 72-byte limit by pre-hashing long passwords."""
    if len(password.encode("utf-8")) > 72:
        return hashlib.sha256(password.encode("utf-8")).hexdigest()
    return password


def _hash_password(password: str) -> str:
    normalized = _normalize_password(password)
    return bcrypt.hashpw(normalized.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def _is_bcrypt_hash(value: str) -> bool:
    return value.startswith("$2a$") or value.startswith("$2b$") or value.startswith("$2y$")


def _verify_password(plain_password: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    normalized = _normalize_password(plain_password)
    try:
        if _is_bcrypt_hash(stored_hash):
            return bcrypt.checkpw(normalized.encode("utf-8"), stored_hash.encode("utf-8"))

        # Legacy SHA256 support for existing users; upgraded to bcrypt on successful login.
        return hashlib.sha256(plain_password.encode("utf-8")).hexdigest() == stored_hash
    except Exception:
        return False


def _generate_access_token(user_id: int) -> str:
    issued_at = str(int(time.time()))
    nonce = secrets.token_hex(8)
    payload = f"{user_id}:{issued_at}:{nonce}"
    signature = hmac.new(TOKEN_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return f"{payload}.{signature}"


def _parse_access_token(token: str) -> int | None:
    try:
        payload, signature = token.rsplit(".", 1)
        expected_sig = hmac.new(TOKEN_SECRET.encode("utf-8"), payload.encode("utf-8"), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected_sig):
            return None

        user_id_str, issued_at_str, _nonce = payload.split(":", 2)
        issued_at = int(issued_at_str)
        if int(time.time()) - issued_at > TOKEN_TTL_SECONDS:
            return None

        return int(user_id_str)
    except Exception:
        return None


def _cleanup_temporary_admin_if_real_admin_exists(db: Session) -> None:
    non_temp_admins = db.query(models.User).filter(
        models.User.role == "admin",
        models.User.email != TEMP_ADMIN_EMAIL,
    ).count()

    if non_temp_admins <= 0:
        return

    temp_admin = db.query(models.User).filter(models.User.email == TEMP_ADMIN_EMAIL).first()
    if temp_admin:
        db.delete(temp_admin)
        db.commit()


def ensure_temporary_admin() -> None:
    db = SessionLocal()
    try:
        _cleanup_temporary_admin_if_real_admin_exists(db)

        has_any_admin = db.query(models.User).filter(models.User.role == "admin").count() > 0
        if has_any_admin:
            return

        temp_admin = db.query(models.User).filter(models.User.email == TEMP_ADMIN_EMAIL).first()
        if temp_admin is None:
            temp_admin = models.User(
                email=TEMP_ADMIN_EMAIL,
                username="admin",
                hashed_password=_hash_password(TEMP_ADMIN_PASSWORD),
                role="admin",
                is_admin=True
            )
            db.add(temp_admin)
            db.commit()
            return

        temp_admin.role = "admin"
        temp_admin.is_admin = True
        temp_admin.hashed_password = _hash_password(TEMP_ADMIN_PASSWORD)
        db.commit()
    finally:
        db.close()


ensure_temporary_admin()


# ─── Reference Supplier DB ────────────────────────────────────────────────────
# Each entry: (name, country, tier, component_category, certifications,
#              price, technical, delivery, warranty, support, cert)
_SEED_SUPPLIERS = [
    # Battery System suppliers
    ("Sungrow", "China", "Tier 1", "BATTERY SYSTEM",
     ["ISO 9001", "IEC 62619", "UL 9540"], 7.5, 9.2, 8.5, 9.0, 8.5, 9.5),
    ("BYD", "China", "Tier 1", "BATTERY SYSTEM",
     ["ISO 9001", "IEC 62619", "UL 9540", "CE"], 8.0, 9.0, 8.0, 9.0, 8.0, 9.0),
    ("CATL", "China", "Tier 1", "BATTERY SYSTEM",
     ["ISO 9001", "IEC 62619", "UL 9540", "CE"], 7.0, 9.5, 7.5, 9.5, 8.0, 9.5),
    ("Panasonic", "Japan", "Tier 1", "BATTERY SYSTEM",
     ["ISO 9001", "IEC 62619", "UL 9540"], 6.5, 9.3, 8.0, 9.5, 9.0, 9.0),
    ("Samsung SDI", "South Korea", "Tier 1", "BATTERY SYSTEM",
     ["ISO 9001", "IEC 62619", "UL 9540"], 6.0, 9.5, 7.5, 9.5, 8.5, 9.5),

    # Power Conversion System (Inverter) suppliers
    ("Sungrow", "China", "Tier 1", "POWER CONVERSION SYSTEM",
     ["ISO 9001", "IEC 62477", "UL 1741", "CE"], 8.0, 9.0, 8.5, 9.0, 8.5, 9.0),
    ("ABB", "Switzerland", "Tier 1", "POWER CONVERSION SYSTEM",
     ["ISO 9001", "IEC 62477", "UL 1741", "CE", "BIS"], 6.0, 9.5, 9.0, 9.5, 9.5, 9.5),
    ("Schneider Electric", "France", "Tier 1", "POWER CONVERSION SYSTEM",
     ["ISO 9001", "IEC 62477", "CE", "BIS"], 6.5, 9.3, 9.0, 9.5, 9.5, 9.3),
    ("Delta Electronics", "Taiwan", "Tier 1", "POWER CONVERSION SYSTEM",
     ["ISO 9001", "IEC 62477", "UL 1741", "CE"], 7.5, 9.0, 8.5, 9.0, 8.5, 9.0),
    ("Sofar Solar", "China", "Tier 2", "POWER CONVERSION SYSTEM",
     ["ISO 9001", "IEC 62477", "CE"], 8.5, 8.0, 8.0, 8.0, 7.5, 8.0),

    # EMS / BMS suppliers
    ("Siemens", "Germany", "Tier 1", "EMS",
     ["ISO 9001", "IEC 61968", "CE", "BIS"], 5.5, 9.8, 9.0, 9.8, 9.8, 9.8),
    ("Schneider Electric", "France", "Tier 1", "EMS",
     ["ISO 9001", "IEC 61968", "CE"], 6.0, 9.5, 9.0, 9.5, 9.5, 9.5),
    ("Enertech", "India", "Tier 2", "EMS",
     ["ISO 9001"], 8.5, 7.5, 8.0, 7.5, 7.5, 7.0),

    # AC Side (switchgear, breakers)
    ("ABB", "Switzerland", "Tier 1", "AC SIDE",
     ["ISO 9001", "IEC 60947", "BIS"], 6.0, 9.5, 9.0, 9.5, 9.5, 9.5),
    ("Schneider Electric", "France", "Tier 1", "AC SIDE",
     ["ISO 9001", "IEC 60947", "CE", "BIS"], 6.5, 9.3, 9.0, 9.5, 9.5, 9.3),
    ("L&T Electrical", "India", "Tier 1", "AC SIDE",
     ["ISO 9001", "IEC 60947", "BIS"], 8.5, 8.5, 9.0, 9.0, 9.0, 8.5),
    ("Havells", "India", "Tier 1", "AC SIDE",
     ["ISO 9001", "BIS"], 8.0, 8.0, 9.0, 8.5, 8.5, 8.0),
    ("Siemens", "Germany", "Tier 1", "AC SIDE",
     ["ISO 9001", "IEC 60947", "CE", "BIS"], 6.0, 9.5, 9.0, 9.5, 9.5, 9.5),

    # DC Side (cables, fuses, disconnects)
    ("Polycab", "India", "Tier 1", "DC SIDE",
     ["ISO 9001", "BIS"], 9.0, 8.0, 9.0, 8.5, 8.0, 8.0),
    ("Havells", "India", "Tier 1", "DC SIDE",
     ["ISO 9001", "BIS"], 8.5, 8.0, 9.0, 8.5, 8.5, 8.0),
    ("ABB", "Switzerland", "Tier 1", "DC SIDE",
     ["ISO 9001", "IEC 60947", "BIS"], 6.5, 9.5, 9.0, 9.5, 9.5, 9.5),
    ("Littelfuse", "USA", "Tier 1", "DC SIDE",
     ["ISO 9001", "UL 248", "CE"], 7.0, 9.3, 8.5, 9.0, 8.5, 9.0),

    # Enclosure / Civil / Structural
    ("Rittal", "Germany", "Tier 1", "ENCLOSURE",
     ["ISO 9001", "IEC 62208", "CE"], 6.0, 9.5, 8.5, 9.5, 9.0, 9.5),
    ("Delta", "India", "Tier 2", "ENCLOSURE",
     ["ISO 9001", "BIS"], 8.5, 7.5, 8.5, 7.5, 7.5, 7.5),
    ("Unifin", "India", "Tier 2", "ENCLOSURE",
     ["ISO 9001", "BIS"], 8.0, 7.5, 8.5, 8.0, 7.5, 7.5),

    # Auxiliary systems (HVAC, fire suppression)
    ("Vertiv", "USA", "Tier 1", "AUXILIARY",
     ["ISO 9001", "UL 1995", "CE"], 6.5, 9.3, 8.5, 9.0, 9.0, 9.0),
    ("Blue Star", "India", "Tier 1", "AUXILIARY",
     ["ISO 9001", "BIS"], 8.0, 8.5, 9.0, 8.5, 8.5, 8.0),
    ("Nohmi Bosai", "Japan", "Tier 1", "AUXILIARY",
     ["ISO 9001", "UL 2127", "CE"], 6.0, 9.5, 8.5, 9.5, 9.0, 9.5),
]

# Scoring weights: price=20%, technical=30%, delivery=15%, warranty=15%, support=10%, cert=10%
_SCORE_WEIGHTS = (0.20, 0.30, 0.15, 0.15, 0.10, 0.10)


def seed_suppliers() -> None:
    """Populate suppliers table if empty."""
    db = SessionLocal()
    try:
        if db.query(models.Supplier).count() > 0:
            return  # already seeded

        for (name, country, tier, category, certs,
             price, tech, delivery, warranty, support, cert) in _SEED_SUPPLIERS:
            ws = (
                price * _SCORE_WEIGHTS[0]
                + tech * _SCORE_WEIGHTS[1]
                + delivery * _SCORE_WEIGHTS[2]
                + warranty * _SCORE_WEIGHTS[3]
                + support * _SCORE_WEIGHTS[4]
                + cert * _SCORE_WEIGHTS[5]
            )
            supplier = models.Supplier(
                user_id=None,  # global / admin-owned
                name=name,
                country=country,
                tier=tier,
                component_category=category,
                certifications=certs,
                price_score=price,
                technical_score=tech,
                delivery_score=delivery,
                warranty_score=warranty,
                support_score=support,
                certification_score=cert,
                weighted_score=round(ws, 2),
            )
            db.add(supplier)
        db.commit()
    finally:
        db.close()


seed_suppliers()


def get_current_user(
    authorization: str | None = Header(default=None, alias="Authorization"),
    db: Session = Depends(get_db),
):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth token")

    token = authorization.split(" ", 1)[1].strip()
    user_id = _parse_access_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Session expired. Please login again")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_admin(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ─── Input Schemas ───────────────────────────────────────────────────────────

class BESSInputs(BaseModel):
    # Load Profile
    peak_demand_kw: float = 400.0
    daily_energy_kwh: float = 350.0
    num_sites: int = 1
    backup_duration_hrs: float = 2.0
    use_case: str = "EV fast charging"
    grid_peak_tariff: float = 12.0
    grid_offpeak_tariff: float = 6.0
    cycles_per_day: float = 2.0
    project_lifetime_yrs: float = 12.0

    # Battery
    dod_pct: float = 85.0
    battery_module_kwh: float = 52.25
    cycle_life: int = 6000
    calendar_life_yrs: int = 10
    round_trip_efficiency_pct: float = 90.0

    # Solar
    solar_pv_kwp: float = 500.0
    solar_cuf_pct: float = 19.0
    solar_capex_per_kwp: float = 25000.0
    solar_om_per_kwp_yr: float = 500.0
    solar_degradation_pct_yr: float = 0.5

    # Savings
    monthly_md_charge_saving: float = 150000.0
    dg_displacement_saving_yr: float = 50000.0

    # BOM Cost Factors
    installation_pct: float = 8.0
    commissioning_pct: float = 3.0
    contingency_pct: float = 5.0

    # Degradation
    annual_degradation_pct: float = 2.0
    tariff_escalation_pct: float = 3.0
    dg_fuel_escalation_pct: float = 5.0
    md_escalation_pct: float = 0.0
    min_soh_pct: float = 80.0

    # DG
    dg_capacity_kw: float = 250.0
    dg_capex: float = 2500000.0
    dg_fuel_cost_yr: float = 1800000.0
    dg_om_yr: float = 150000.0


@app.post("/api/auth/signup")
async def signup(payload: SignUpPayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=email,
        username=email.split("@")[0],
        hashed_password=_hash_password(payload.password),
        role="user"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = _generate_access_token(user.id)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_temporary_admin": False,
        },
    }


@app.post("/api/auth/admin/signup")
async def admin_signup(
    payload: AdminSignUpPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = models.User(
        email=email,
        username=email.split("@")[0],
        hashed_password=_hash_password(payload.password),
        role="admin",
        is_admin=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "created_by": current_user.email,
    }


@app.get("/bess-app-admin")
async def get_admin_accounts(db: Session = Depends(get_db), current_user=Depends(require_admin)):
    all_users = db.query(models.User).order_by(models.User.created_at.desc()).all()

    def _fmt(u):
        return {
            "id": u.id,
            "email": u.email,
            "username": getattr(u, "username", None),
            "is_active": getattr(u, "is_active", True),
            "created_at": u.created_at.isoformat() if getattr(u, "created_at", None) else None,
        }

    return {
        "created_by": current_user.email,
        "admins": [_fmt(u) for u in all_users if u.role == "admin"],
        "users":  [_fmt(u) for u in all_users if u.role != "admin"],
    }


@app.patch("/api/admin/users/{user_id}")
async def patch_user(
    user_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    """Admin: activate / deactivate a user account."""
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account")
    if "is_active" in payload:
        target.is_active = bool(payload["is_active"])
    db.commit()
    return {"id": target.id, "is_active": target.is_active}


@app.post("/bess-app-admin")
async def create_admin_account(
    payload: AdminSignUpPayload,
    db: Session = Depends(get_db),
    current_user=Depends(require_admin),
):
    email = payload.email.strip().lower()
    if not email or not payload.password:
        raise HTTPException(status_code=400, detail="Email and password are required")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    admin_user = models.User(
        email=email,
        username=email.split("@")[0],
        hashed_password=_hash_password(payload.password),
        role="admin",
        is_admin=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    return {
        "id": admin_user.id,
        "email": admin_user.email,
        "role": admin_user.role,
        "created_by": current_user.email,
    }


@app.post("/api/auth/login")
async def login(payload: LoginPayload, db: Session = Depends(get_db)):
    email = payload.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or not _verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not _is_bcrypt_hash(user.hashed_password):
        user.hashed_password = _hash_password(payload.password)
        db.commit()
        db.refresh(user)

    token = _generate_access_token(user.id)
    return {
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "role": user.role,
            "is_temporary_admin": user.email == TEMP_ADMIN_EMAIL,
        },
    }


# ─── Embedded BOM Catalogue (fallback when DB catalog is empty) ──────────────
# Format: (bom_num, category, description, qty_formula, unit, spec, unit_price)
_BOM_CATALOGUE = [
    (1,  "BATTERY SYSTEM",          "Battery Module/Pack — Complete",        "n",        "system", "51.2V, 1020Ah, 52.25kWh",              520000),
    (5,  "AC SIDE",                 "AC Main Circuit Breaker",               "inv",      "pcs",    "125A, 400–690VAC",                      4500),
    (6,  "AC SIDE",                 "AC Disconnect Switch",                  "inv",      "pcs",    "125A, 400–690VAC",                      3500),
    (7,  "AC SIDE",                 "AC Surge Protection Device",            "inv",      "pcs",    "400VAC, 40kA",                          2500),
    (8,  "AC SIDE",                 "AC Power Meter",                        "inv",      "pcs",    "0.5S class, Modbus",                    8000),
    (9,  "AC SIDE",                 "Current Transformers (CTs)",            "inv * 3",  "pcs",    "125/5A or 150/5A",                       600),
    (10, "AC SIDE",                 "AC Distribution Panel",                 "1",        "pcs",    "125A main + branch circuits",           12000),
    (11, "POWER CONVERSION SYSTEM", "Hybrid Inverter 50kW",                  "inv",      "pcs",    "50kW, 48–58V DC, 3-ph 400VAC",         180000),
    (12, "POWER CONVERSION SYSTEM", "Inverter Communication Module",         "1",        "pcs",    "Modbus RTU/TCP, CAN",                   5000),
    (13, "DC SIDE",                 "DC Main Circuit Breaker",               "inv",      "pcs",    "800A, 80–100VDC",                       15000),
    (14, "DC SIDE",                 "DC Fused Disconnect",                   "inv",      "pcs",    "630–800A, 80VDC",                       8000),
    (15, "DC SIDE",                 "DC Power Cable — Main (+)",             "inv * 19", "m",      "240mm², 1000VDC rated, red",            350),
    (16, "DC SIDE",                 "DC Power Cable — Main (−)",             "inv * 19", "m",      "240mm², 1000VDC rated, black",          350),
    (17, "DC SIDE",                 "DC Cable Lugs",                         "inv * 19", "pcs",    "M12 stud, 1600A rated",                  80),
    (18, "DC SIDE",                 "DC Surge Protection Device",            "1",        "pcs",    "80VDC, 20kA",                           3000),
    (19, "DC SIDE",                 "DC Shunt (Optional)",                   "1",        "pcs",    "1500A, 75mV, 0.5% accuracy",            2500),
    (20, "EMS",                     "EMS Controller / Software",             "1",        "system", "Supports 50–500kWh",                       0),
    (21, "EMS",                     "EMS Gateway / Server",                  "1",        "pcs",    "Linux/Windows, Modbus master",             0),
    (22, "EMS",                     "HMI Touchscreen Panel",                 "1",        "pcs",    "10–12 inch, IP65 front panel",          18000),
    (23, "EMS",                     "Network Switch",                        "1",        "pcs",    "8-port managed",                        4000),
    (24, "EMS",                     "4G/LTE Router",                         "1",        "pcs",    "Dual SIM, VPN capable",                 8000),
    (25, "EMS",                     "Data Logger (Optional)",                "1",        "pcs",    "Modbus RTU/TCP, SD card",               6000),
    (26, "CONTROL WIRING",          "Modbus Cable RS485",                    "30",       "m",      "2×1.5mm² + shield, 120Ω",                45),
    (27, "CONTROL WIRING",          "CAN Bus Cable",                         "15",       "m",      "Twisted pair, 120Ω termination",          60),
    (28, "CONTROL WIRING",          "Ethernet Cable CAT6",                   "30",       "m",      "Outdoor rated",                          35),
    (29, "CONTROL WIRING",          "Control Power Cable",                   "20",       "m",      "4×1.5mm², 300/500V",                     50),
    (30, "CONTROL WIRING",          "RS485 Terminators",                     "2",        "pcs",    "120Ω, 0.25W",                            30),
    (31, "CONTROL WIRING",          "RJ45 Connectors",                       "10",       "pcs",    "CAT6 shielded",                          25),
    (32, "GROUNDING",               "Ground Rod",                            "2",        "pcs",    "5/8 inch × 8–10 ft",                    500),
    (33, "GROUNDING",               "Ground Cable — Main",                   "20",       "m",      "35–70mm²",                              120),
    (34, "GROUNDING",               "Ground Busbar",                         "1",        "pcs",    "12-hole, 600mm",                        2000),
    (35, "GROUNDING",               "Ground Lugs",                           "12",       "pcs",    "For 35–70mm² cable",                     60),
    (36, "GROUNDING",               "Bonding Jumpers",                       "5",        "pcs",    "35mm², 300–500mm length",               150),
    (37, "GROUNDING",               "Lightning Arrester (Optional)",         "1",        "system", "Per local requirements",                5000),
    (38, "AUXILIARY",               "Auxiliary Power Panel",                 "1",        "pcs",    "63A, 230VAC, 6–8 circuits",             7000),
    (39, "AUXILIARY",               "UPS for Controls",                      "1",        "pcs",    "24VDC, 500VA, 2-hr runtime",           12000),
    (40, "AUXILIARY",               "24VDC Power Supply",                    "1",        "pcs",    "10A, 240W",                             3500),
    (41, "AUXILIARY",               "Control Relays",                        "5",        "pcs",    "DPDT, 10A, 24VDC coil",                  200),
    (42, "AUXILIARY",               "Emergency Stop Button",                 "2",        "pcs",    "Twist-release, IP65",                    800),
    (43, "AUXILIARY",               "Status Indicator Lights",               "5",        "pcs",    "Red/Yellow/Green, 24VDC",                150),
    (44, "ENCLOSURE",               "Control Cabinet",                       "1",        "pcs",    "800×600×300mm",                         18000),
    (45, "ENCLOSURE",               "DIN Rail",                              "3",        "m",      "Heavy duty",                             200),
    (46, "ENCLOSURE",               "Cable Tray",                            "10",       "m",      "300mm width",                            500),
    (47, "ENCLOSURE",               "Cable Glands",                          "15",       "pcs",    "Various sizes, IP65",                     80),
    (48, "ENCLOSURE",               "Weatherproof Junction Box",             "2",        "pcs",    "300×300×150mm, IP65",                   1200),
    (49, "INSTALLATION",            "Conduit — EMT/PVC",                     "20",       "m",      "25–50mm diameter",                        80),
    (50, "INSTALLATION",            "Conduit Fittings",                      "1",        "set",    "Complete fittings kit",                 2000),
    (51, "INSTALLATION",            "Cable Ties — Heavy Duty",               "100",      "pcs",    "300–500mm length",                         8),
    (52, "INSTALLATION",            "Warning Labels",                        "1",        "set",    "High voltage DC/AC warnings",           1500),
    (55, "TESTING",                 "Digital Multimeter",                    "1",        "pcs",    "CAT III 600V",                          3500),
    (56, "TESTING",                 "Clamp Meter",                           "1",        "pcs",    "1000A range",                           5000),
    (57, "TESTING",                 "Insulation Tester",                     "1",        "pcs",    "500–1000VDC test",                      8000),
    (58, "TESTING",                 "Commissioning Service",                 "1",        "service","2–3 days on-site",                      35000),
    (60, "DOCUMENTATION",           "Equipment Submittals",                  "1",        "set",    "All major equipment",                   5000),
]


# ─── Core Calculation Engine ─────────────────────────────────────────────────

def _eval_qty(formula_str: str, sizing_vars: dict) -> float:
    """Safely evaluate a qty_formula string using sizing variables.

    Allowed tokens: digits, decimal point, +, -, *, /, (, ) and sizing variable names.
    """
    import re
    s = str(formula_str).strip()
    if not s:
        return 1
    # Try as plain number first (fast path)
    try:
        return float(s)
    except ValueError:
        pass
    # Substitute known variable names
    allowed_names = set(sizing_vars.keys())
    # Validate: only allow digits, operators, parens, spaces, and known names
    token_pattern = re.compile(r"[a-zA-Z_]\w*|[\d.]+|[+\-*/()., ]")
    tokens = token_pattern.findall(s)
    reconstructed = "".join(tokens)
    for tok in tokens:
        if tok[0].isalpha() and tok not in allowed_names:
            return 1  # unknown variable → default to 1
    try:
        return float(eval(reconstructed, {"__builtins__": {}}, sizing_vars))  # noqa: S307
    except Exception:
        return 1


def calculate_bess(inp: BESSInputs, catalog_items=None) -> dict:
    # ── SIZING (Sheet 1) ──────────────────────────────────────────────────────
    required_energy = inp.peak_demand_kw * inp.backup_duration_hrs
    dod = inp.dod_pct / 100
    eta = inp.round_trip_efficiency_pct / 100
    installed_cap_required = required_energy / dod
    num_modules = math.ceil(installed_cap_required / inp.battery_module_kwh)
    actual_installed_kwh = num_modules * inp.battery_module_kwh
    num_inverters = math.ceil(inp.peak_demand_kw / 50)
    cable_length = num_inverters * 19

    sizing_vars = {
        "n": num_modules, "num_modules": num_modules,
        "inv": num_inverters, "num_inverters": num_inverters,
        "cable_length": cable_length,
    }

    # ── BOM COST (DB catalog or embedded fallback) ────────────────────────────
    bom_items = []
    bom_equipment_total = 0
    if catalog_items and len(catalog_items) > 0:
        for item in catalog_items:
            qty = _eval_qty(item.qty_formula or "1", sizing_vars)
            unit_price = float(item.unit_price or 0)
            line_total = qty * unit_price
            bom_equipment_total += line_total
            bom_items.append({
                "id": item.id,
                "category": item.category or "",
                "description": item.description or "",
                "qty": round(qty, 2),
                "unit": item.unit or "pcs",
                "spec": item.spec or "",
                "unit_price": unit_price,
                "line_total": round(line_total, 2),
            })
    else:
        # Embedded 60-item catalogue from BESS_Logic_Windsurf reference
        for (bom_num, cat, desc, qty_expr, unit, spec, unit_price) in _BOM_CATALOGUE:
            qty = _eval_qty(qty_expr, sizing_vars)
            line_total = qty * unit_price
            bom_equipment_total += line_total
            bom_items.append({
                "id": bom_num,
                "category": cat,
                "description": desc,
                "qty": round(qty, 2),
                "unit": unit,
                "spec": spec,
                "unit_price": unit_price,
                "line_total": round(line_total, 2),
            })

    # ── CAPEX (Sheet 2) ───────────────────────────────────────────────────────
    installation_cost  = bom_equipment_total * (inp.installation_pct / 100)
    commissioning_cost = bom_equipment_total * (inp.commissioning_pct / 100)
    # Contingency on BOM only (5.55% matches sheet; user input used as-is)
    contingency_cost   = bom_equipment_total * (inp.contingency_pct / 100)
    total_capex = bom_equipment_total + installation_cost + commissioning_cost + contingency_cost

    # ── OPEX (Sheet 2) ────────────────────────────────────────────────────────
    annual_om       = total_capex * 0.015   # 1.5% of CAPEX
    insurance       = total_capex * 0.005   # 0.5% of CAPEX
    monitoring      = 10000                 # fixed ₹10,000/yr
    total_annual_opex = annual_om + insurance + monitoring
    lifetime_opex     = total_annual_opex * inp.project_lifetime_yrs

    # ── LCOS (Sheet 2) ────────────────────────────────────────────────────────
    annual_cycles    = inp.cycles_per_day * 365
    total_cycles     = annual_cycles * inp.calendar_life_yrs
    energy_throughput = actual_installed_kwh * dod * eta * total_cycles
    lcos = (total_capex + lifetime_opex) / energy_throughput if energy_throughput > 0 else 0

    # ── SAVINGS (Sheet 3) ─────────────────────────────────────────────────────
    # daily_dischargeable uses DoD only — no RTE (Sheet 3 formula)
    daily_dischargeable   = actual_installed_kwh * dod
    arbitrage_per_kwh     = inp.grid_peak_tariff - inp.grid_offpeak_tariff
    daily_arbitrage       = daily_dischargeable * arbitrage_per_kwh
    annual_arbitrage      = daily_arbitrage * 365
    annual_md_saving      = inp.monthly_md_charge_saving * 12
    total_annual_savings  = annual_arbitrage + annual_md_saving + inp.dg_displacement_saving_yr

    # ── ROI (Sheet 3) ─────────────────────────────────────────────────────────
    net_annual_benefit  = total_annual_savings - total_annual_opex
    simple_payback      = total_capex / net_annual_benefit if net_annual_benefit > 0 else 999
    cumulative_10yr_net = net_annual_benefit * min(10, int(inp.project_lifetime_yrs)) - total_capex
    roi_10yr            = ((cumulative_10yr_net + total_capex) / total_capex) * 100 if total_capex > 0 else 0
    annual_roi_pct      = (net_annual_benefit / total_capex) * 100 if total_capex > 0 else 0

    # ── YEAR-BY-YEAR CASHFLOW (Sheet 4 degradation model) ────────────────────
    cashflow_years = []
    cumulative = -total_capex
    for yr in range(1, int(inp.project_lifetime_yrs) + 1):
        # Exponential SOH decay: Yr1 = (1-r)^1
        soh_pct       = 100.0 * ((1 - inp.annual_degradation_pct / 100) ** yr)
        usable_cap    = actual_installed_kwh * (soh_pct / 100)
        # Escalated peak tariff, spread against fixed off-peak
        esc_peak      = inp.grid_peak_tariff * ((1 + inp.tariff_escalation_pct / 100) ** (yr - 1))
        esc_spread    = esc_peak - inp.grid_offpeak_tariff
        degraded_arb  = usable_cap * dod * esc_spread * 365
        md_saving_yr  = annual_md_saving * ((1 + inp.md_escalation_pct / 100) ** (yr - 1))
        dg_saving_yr  = inp.dg_displacement_saving_yr * ((1 + inp.dg_fuel_escalation_pct / 100) ** (yr - 1))
        total_saving_yr = degraded_arb + md_saving_yr + dg_saving_yr
        net_yr          = total_saving_yr - total_annual_opex
        cumulative     += net_yr
        cashflow_years.append({
            "year": yr,
            "soh_pct": round(soh_pct, 1),
            "usable_capacity_kwh": round(usable_cap, 0),
            "arbitrage_saving": round(degraded_arb, 0),
            "md_dg_saving": round(md_saving_yr + dg_saving_yr, 0),
            "total_saving": round(total_saving_yr, 0),
            "net_benefit": round(net_yr, 0),
            "cumulative_net": round(cumulative, 0),
        })

    # ── OPTIMALITY CHECK (Sheet 4 — 8 criteria) ───────────────────────────────
    capex_per_kwh = total_capex / actual_installed_kwh if actual_installed_kwh > 0 else 0
    optimality_criteria = [
        {"id": 1, "name": "LCOS vs Grid Peak Tariff",  "value": round(lcos, 4),          "benchmark": f"< ₹{inp.grid_peak_tariff}/kWh",  "pass": lcos < inp.grid_peak_tariff,         "display": f"₹{lcos:.2f}/kWh"},
        {"id": 2, "name": "Simple Payback Period",     "value": round(simple_payback, 1), "benchmark": "< 5 yrs (warn < 8)",              "pass": simple_payback < 5,  "warn": simple_payback < 8, "display": f"{simple_payback:.1f} yrs"},
        {"id": 3, "name": "10-Yr Net Return",          "value": round(cumulative_10yr_net, 0), "benchmark": "Positive",                   "pass": cumulative_10yr_net > 0,             "display": f"₹{cumulative_10yr_net:,.0f}"},
        {"id": 4, "name": "Annual ROI on CAPEX",       "value": round(annual_roi_pct, 1), "benchmark": "≥ 15% pa",                        "pass": annual_roi_pct >= 15,                "display": f"{annual_roi_pct:.1f}%"},
        {"id": 5, "name": "CAPEX per kWh vs Market",   "value": round(capex_per_kwh, 0),  "benchmark": "₹10,000–₹18,000/kWh",             "pass": 10000 <= capex_per_kwh <= 18000,     "display": f"₹{capex_per_kwh:,.0f}/kWh"},
        {"id": 6, "name": "DoD within LFP safe range", "value": inp.dod_pct,              "benchmark": "80%–95%",                         "pass": 80 <= inp.dod_pct <= 95,             "display": f"{inp.dod_pct:.1f}%"},
        {"id": 7, "name": "Module Sizing",             "value": num_modules,              "benchmark": "≥ 1 module",                      "pass": num_modules >= 1,                    "display": str(num_modules)},
        {"id": 8, "name": "BOM Completeness",          "value": round(bom_equipment_total, 0), "benchmark": "All items priced",           "pass": bom_equipment_total > 0,             "display": f"₹{bom_equipment_total:,.0f}"},
    ]
    passed_count = sum(1 for c in optimality_criteria if c.get("pass"))
    optimality_verdict = "OPTIMAL" if passed_count >= 6 else "REVIEW" if passed_count >= 4 else "NOT VIABLE"

    # ── SOLAR ─────────────────────────────────────────────────────────────────
    solar_annual_gen   = inp.solar_pv_kwp * (inp.solar_cuf_pct / 100) * 8760
    solar_capex        = inp.solar_pv_kwp * inp.solar_capex_per_kwp
    solar_annual_om    = inp.solar_pv_kwp * inp.solar_om_per_kwp_yr
    solar_lifetime_cost = solar_capex + solar_annual_om * inp.calendar_life_yrs
    solar_throughput   = solar_annual_gen * inp.calendar_life_yrs * (1 - inp.solar_degradation_pct_yr / 100 * 5)
    lcos_solar = solar_lifetime_cost / solar_throughput if solar_throughput > 0 else 0

    # ── DG ────────────────────────────────────────────────────────────────────
    dg_annual_cost = inp.dg_fuel_cost_yr + inp.dg_om_yr
    dg_lifetime    = inp.dg_capex + dg_annual_cost * inp.calendar_life_yrs
    dg_gen_kwh_yr  = inp.dg_capacity_kw * 8 * 365
    dg_throughput  = dg_gen_kwh_yr * inp.calendar_life_yrs
    lcos_dg = dg_lifetime / dg_throughput if dg_throughput > 0 else 0

    # ── BESS + Solar ─────────────────────────────────────────────────────────
    combined_capex      = total_capex + solar_capex
    combined_opex_yr    = total_annual_opex + solar_annual_om
    combined_lifetime   = combined_capex + combined_opex_yr * inp.calendar_life_yrs
    combined_throughput = energy_throughput + solar_throughput
    lcos_bess_solar = combined_lifetime / combined_throughput if combined_throughput > 0 else 0

    # ── SENSITIVITY (Sheet 5) ─────────────────────────────────────────────────
    bom_multipliers = [0.80, 0.90, 1.00, 1.10, 1.20, 1.30]
    tariffs = [8, 10, 12, 14, 16, 18]
    sensitivity = []
    for t in tariffs:
        row = {"tariff": t, "paybacks": {}}
        for m in bom_multipliers:
            scaled_capex = total_capex * m
            arb = daily_dischargeable * (t - inp.grid_offpeak_tariff) * 365
            net = arb + annual_md_saving + inp.dg_displacement_saving_yr - total_annual_opex
            pb = round(scaled_capex / net, 1) if net > 0 else 99
            row["paybacks"][str(m)] = pb
        sensitivity.append(row)

    # ── LCOS MATRIX (Sheet 5 Table 2) ────────────────────────────────────────
    dods_pct    = [70, 80, 85, 90, 95]
    cycle_lives = [2000, 3000, 4000, 5000, 6000]
    total_lifetime_cost = total_capex + lifetime_opex
    lcos_matrix = []
    for cl in cycle_lives:
        row = {"cycle_life": cl, "values": {}}
        for d in dods_pct:
            throughput = actual_installed_kwh * (d / 100) * eta * cl
            lcos_val   = total_lifetime_cost / throughput if throughput > 0 else 0
            row["values"][str(d)] = round(lcos_val, 2)
        lcos_matrix.append(row)

    # ── COMPARISON ────────────────────────────────────────────────────────────
    comparison = {
        "BESS Only":   {"lcos": round(lcos, 2),           "npv_lcos": round(lcos * 0.82, 2),           "lifetime_cost": round(total_capex + lifetime_opex, 0),  "energy_throughput_kwh": round(energy_throughput, 0),  "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos, 2)},
        "Solar Only":  {"lcos": round(lcos_solar, 2),     "npv_lcos": round(lcos_solar * 0.82, 2),     "lifetime_cost": round(solar_lifetime_cost, 0),          "energy_throughput_kwh": round(solar_throughput, 0),   "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos_solar, 2)},
        "DG Only":     {"lcos": round(lcos_dg, 2),        "npv_lcos": round(lcos_dg * 0.82, 2),        "lifetime_cost": round(dg_lifetime, 0),                  "energy_throughput_kwh": round(dg_throughput, 0),      "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos_dg, 2)},
        "BESS + Solar":{"lcos": round(lcos_bess_solar, 2),"npv_lcos": round(lcos_bess_solar * 0.82, 2),"lifetime_cost": round(combined_lifetime, 0),            "energy_throughput_kwh": round(combined_throughput, 0),"lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos_bess_solar, 2)},
    }

    return {
        "sizing": {
            "required_energy_kwh": round(required_energy, 1),
            "installed_cap_required_kwh": round(installed_cap_required, 1),
            "num_modules": num_modules,
            "actual_installed_kwh": round(actual_installed_kwh, 2),
            "num_inverters": num_inverters,
            "daily_dischargeable_kwh": round(daily_dischargeable, 2),
        },
        "capex": {
            "bom_equipment_total": round(bom_equipment_total, 0),
            "installation_cost": round(installation_cost, 0),
            "commissioning_cost": round(commissioning_cost, 0),
            "contingency_cost": round(contingency_cost, 0),
            "total_capex": round(total_capex, 0),
            "total_capex_lakhs": round(total_capex / 100000, 2),
        },
        "opex": {
            "annual_om": round(annual_om, 0),
            "insurance": round(insurance, 0),
            "monitoring": monitoring,
            "total_annual_opex": round(total_annual_opex, 0),
            "lifetime_opex": round(lifetime_opex, 0),
        },
        "lcos": {
            "annual_cycles": annual_cycles,
            "total_cycles": total_cycles,
            "energy_throughput_kwh": round(energy_throughput, 0),
            "lcos_inr_per_kwh": round(lcos, 4),
        },
        "savings": {
            "daily_dischargeable_kwh": round(daily_dischargeable, 2),
            "arbitrage_per_kwh": arbitrage_per_kwh,
            "daily_arbitrage": round(daily_arbitrage, 2),
            "annual_arbitrage": round(annual_arbitrage, 2),
            "annual_md_saving": round(annual_md_saving, 2),
            "dg_displacement": inp.dg_displacement_saving_yr,
            "total_annual_savings": round(total_annual_savings, 2),
            "total_annual_savings_lakhs": round(total_annual_savings / 100000, 2),
        },
        "roi": {
            "net_annual_benefit": round(net_annual_benefit, 2),
            "simple_payback_yrs": round(simple_payback, 1),
            "cumulative_10yr_net": round(cumulative_10yr_net, 0),
            "roi_10yr_pct": round(roi_10yr, 1),
            "annual_roi_pct": round(annual_roi_pct, 1),
        },
        "optimality": {
            "criteria": optimality_criteria,
            "passed": passed_count,
            "total": 8,
            "verdict": optimality_verdict,
        },
        "cashflow_years": cashflow_years,
        "sensitivity": sensitivity,
        "lcos_matrix": lcos_matrix,
        "comparison": comparison,
        "bom_items": bom_items,
        "bom_summary": {
            "total_bom": round(bom_equipment_total, 0),
            "num_line_items": len(bom_items),
        },
    }


# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.post("/api/calculate")
async def calculate(inp: BESSInputs, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    # Fetch admin-managed BOM catalog to use in calculation
    catalog_items = db.query(models.ComponentCatalog).all()
    result = calculate_bess(inp, catalog_items=catalog_items if catalog_items else None)
    # Store in DB
    record = crud.create_calculation(db, inp.dict(), result, user_id=current_user.id)
    ts = getattr(record, "created_at", None) or getattr(record, "timestamp", None)
    return {"id": record.id, "timestamp": ts.isoformat() if ts else None, **result}


@app.get("/api/calculations")
async def list_calculations(limit: int = 20, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    records = crud.list_calculations(db, limit, user_id=None if current_user.role == "admin" else current_user.id)
    return [
        {
            "id": r.id,
            "timestamp": ((getattr(r, "created_at", None) or getattr(r, "timestamp", None)).isoformat()
                          if (getattr(r, "created_at", None) or getattr(r, "timestamp", None)) else None),
            "total_capex": getattr(r, "total_capex", None),
            "lcos": getattr(r, "lcos", None),
            "payback_yrs": getattr(r, "payback_yrs", None),
            "use_case": r.use_case,
        }
        for r in records
    ]


@app.get("/api/calculations/{calc_id}")
async def get_calculation(calc_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    record = crud.get_calculation(db, calc_id, user_id=current_user.id, is_admin=current_user.role == "admin")
    if not record:
        raise HTTPException(status_code=404, detail="Calculation not found")
    ts = getattr(record, "created_at", None) or getattr(record, "timestamp", None)
    return {
        "id": record.id,
        "timestamp": ts.isoformat() if ts else None,
        "inputs": getattr(record, "inputs_json", None) or getattr(record, "inputs", None),
        "results": getattr(record, "results_json", None) or getattr(record, "results", None),
    }


@app.get("/api/bom/{calc_id}")
async def get_bom(calc_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    owned_calc = crud.get_calculation(db, calc_id, user_id=current_user.id, is_admin=current_user.role == "admin")
    if not owned_calc:
        raise HTTPException(status_code=404, detail="Calculation not found")
    items = crud.get_bom_items(db, calc_id)
    return [{"id": i.id, "category": i.category, "description": i.description,
             "qty": i.qty, "unit": i.unit, "spec": i.spec,
             "unit_price": i.unit_price, "line_total": i.line_total} for i in items]


@app.get("/api/suppliers")
async def list_suppliers(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from sqlalchemy import or_
    q = db.query(models.Supplier)
    if current_user.role != "admin":
        # Show global suppliers (user_id IS NULL) and user's own suppliers
        q = q.filter(
            or_(models.Supplier.user_id == None, models.Supplier.user_id == current_user.id)
        )
    suppliers = q.order_by(models.Supplier.weighted_score.desc().nullslast(), models.Supplier.id.desc()).all()
    def _s10(v):
        """Return score scaled to 0-100 (scores stored as 0-10)."""
        return round(v * 10, 1) if v is not None else None

    return [
        {
            "id": s.id,
            "name": s.name,
            "component_category": s.component_category,
            "country": getattr(s, "country", None),
            "tier": getattr(s, "tier", None),
            "certifications": getattr(s, "certifications", None),
            "price_score": _s10(s.price_score),
            "technical_score": _s10(s.technical_score),
            "delivery_score": _s10(s.delivery_score),
            "warranty_score": _s10(getattr(s, "warranty_score", None)),
            "support_score": _s10(getattr(s, "support_score", None)),
            "certification_score": _s10(getattr(s, "certification_score", None)),
            "weighted_score": _s10(s.weighted_score),
        }
        for s in suppliers
    ]


# ─── Permutation & Combination Engine ────────────────────────────────────────

MODULE_SIZES = [25, 50, 52.25, 100, 150]          # kWh per module
INVERTER_SIZES = [25, 50, 100, 150, 200, 250, 500]  # kW per inverter unit

def generate_configurations(inp: BESSInputs) -> List[dict]:
    """Generate ranked kW × kWh × module combos.

    Multiple inverters can be paralleled, so we only skip a size when it would
    require an unreasonably large stack (> 20 units) or produces zero power.
    """
    configs = []
    required_energy = inp.peak_demand_kw * inp.backup_duration_hrs
    installed_cap_required = required_energy / (inp.dod_pct / 100)

    seen = set()  # deduplicate (num_modules, module_kwh, num_inverters, inv_kw)

    for module_kwh in MODULE_SIZES:
        num_modules = math.ceil(installed_cap_required / module_kwh)
        actual_kwh = num_modules * module_kwh

        for inv_kw in INVERTER_SIZES:
            num_inverters = math.ceil(inp.peak_demand_kw / inv_kw)

            # Skip combos that need more than 20 inverter units (impractical)
            if num_inverters > 20:
                continue

            key = (num_modules, module_kwh, num_inverters, inv_kw)
            if key in seen:
                continue
            seen.add(key)

            efficiency_score = min(100, (actual_kwh / installed_cap_required) * 100)
            # Cost score: lower inverter+module cost → higher score; clamp to 0-100
            raw_cost = (num_modules * 500_000 + num_inverters * 180_000) / 100_000
            cost_score = max(0, 100 - raw_cost)

            overall_score = efficiency_score * 0.6 + cost_score * 0.4

            configs.append({
                "num_modules": num_modules,
                "module_kwh": module_kwh,
                "total_kwh": round(actual_kwh, 2),
                "num_inverters": num_inverters,
                "inverter_kw": inv_kw,
                "total_kw": round(num_inverters * inv_kw, 2),
                "efficiency_score": round(efficiency_score, 1),
                "cost_score": round(cost_score, 1),
                "overall_score": round(overall_score, 1),
            })

    # Sort best first
    configs.sort(key=lambda x: x["overall_score"], reverse=True)

    for i, c in enumerate(configs):
        c["rank"] = i + 1
        c["is_recommended"] = (i == 0)

    return configs


# ─── Supplier Scoring Engine ───────────────────────────────────────────────

def calculate_supplier_score(
    price_score: float,
    technical_score: float,
    delivery_score: float,
    warranty_score: float,
    support_score: float,
    cert_score: float,
    weights: dict = None
) -> float:
    """Calculate weighted supplier score"""
    if weights is None:
        weights = {
            "price": 30,
            "technical": 25,
            "delivery": 15,
            "warranty": 10,
            "support": 10,
            "cert": 10
        }
    
    weighted = (
        price_score * weights["price"] +
        technical_score * weights["technical"] +
        delivery_score * weights["delivery"] +
        warranty_score * weights["warranty"] +
        support_score * weights["support"] +
        cert_score * weights["cert"]
    ) / 100
    
    return round(weighted, 2)


# ─── New API Endpoints ───────────────────────────────────────────────────────

@app.post("/api/projects")
async def create_project(data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Create new project with energy inputs"""
    project = models.Project(
        user_id=current_user.id,
        name=data.get("name", "New Project"),
        use_case=data.get("use_case", "EV fast charging"),
        peak_demand_kw=data.get("peak_demand_kw", 400),
        daily_energy_kwh=data.get("daily_energy_kwh", 350),
        num_sites=data.get("num_sites", 1),
        backup_duration_hrs=data.get("backup_duration_hrs", 2),
        grid_peak_tariff=data.get("grid_peak_tariff", 12),
        grid_offpeak_tariff=data.get("grid_offpeak_tariff", 6),
        cycles_per_day=data.get("cycles_per_day", 2),
        project_lifetime_yrs=data.get("project_lifetime_yrs", 12),
        dod_pct=data.get("dod_pct", 85),
        battery_module_kwh=data.get("battery_module_kwh", 52.25),
        cycle_life=data.get("cycle_life", 6000),
        round_trip_efficiency_pct=data.get("round_trip_efficiency_pct", 90),
        solar_pv_kwp=data.get("solar_pv_kwp", 0),
        solar_cuf_pct=data.get("solar_cuf_pct", 19),
        inputs_json=data
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return {"id": project.id, "name": project.name, "created_at": project.created_at.isoformat()}


@app.get("/api/projects")
async def list_projects(limit: int = 20, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """List all projects"""
    q = db.query(models.Project)
    if current_user.role != "admin":
        q = q.filter(models.Project.user_id == current_user.id)
    projects = q.order_by(models.Project.created_at.desc()).limit(limit).all()
    return [{"id": p.id, "name": p.name, "use_case": p.use_case, 
             "peak_kw": p.peak_demand_kw, "created_at": p.created_at.isoformat()} for p in projects]


@app.post("/api/projects/{project_id}/configurations")
async def generate_project_configs(project_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Generate configuration permutations for a project"""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed for this project")
    
    # Create BESSInputs from project
    inp = BESSInputs(
        peak_demand_kw=project.peak_demand_kw,
        daily_energy_kwh=project.daily_energy_kwh,
        backup_duration_hrs=project.backup_duration_hrs,
        dod_pct=project.dod_pct,
        battery_module_kwh=project.battery_module_kwh,
        # ... other fields
    )
    
    # Generate configurations
    configs = generate_configurations(inp)
    
    # Store in database
    for cfg in configs:
        config = models.Configuration(
            project_id=project_id,
            num_modules=cfg["num_modules"],
            module_kwh=cfg["module_kwh"],
            total_kwh=cfg["total_kwh"],
            num_inverters=cfg["num_inverters"],
            inverter_kw=cfg["inverter_kw"],
            total_kw=cfg["total_kw"],
            efficiency_score=cfg["efficiency_score"],
            cost_score=cfg["cost_score"],
            overall_score=cfg["overall_score"],
            is_recommended=cfg["is_recommended"],
            rank=cfg["rank"]
        )
        db.add(config)
    
    db.commit()
    return {"project_id": project_id, "configurations": configs}


@app.get("/api/projects/{project_id}/configurations")
async def get_project_configs(project_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get configurations for a project"""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if current_user.role != "admin" and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed for this project")

    configs = db.query(models.Configuration).filter(
        models.Configuration.project_id == project_id
    ).order_by(models.Configuration.rank).all()

    # Auto-generate configurations if none exist yet
    if not configs:
        inp = BESSInputs(
            peak_demand_kw=getattr(project, "peak_demand_kw", None) or 400.0,
            daily_energy_kwh=getattr(project, "daily_energy_kwh", None) or 350.0,
            backup_duration_hrs=getattr(project, "backup_duration_hrs", None) or 2.0,
            dod_pct=getattr(project, "dod_pct", None) or 85.0,
            battery_module_kwh=getattr(project, "battery_module_kwh", None) or 52.25,
        )
        generated = generate_configurations(inp)
        for cfg in generated:
            config = models.Configuration(
                project_id=project_id,
                num_modules=cfg["num_modules"],
                module_kwh=cfg["module_kwh"],
                total_kwh=cfg["total_kwh"],
                num_inverters=cfg["num_inverters"],
                inverter_kw=cfg["inverter_kw"],
                total_kw=cfg.get("total_kw"),
                efficiency_score=cfg["efficiency_score"],
                cost_score=cfg["cost_score"],
                overall_score=cfg["overall_score"],
                is_recommended=cfg["is_recommended"],
                rank=cfg["rank"]
            )
            db.add(config)
        db.commit()
        configs = db.query(models.Configuration).filter(
            models.Configuration.project_id == project_id
        ).order_by(models.Configuration.rank).all()

    return [{
        "id": c.id,
        "num_modules": c.num_modules,
        "module_kwh": c.module_kwh,
        "total_kwh": c.total_kwh,
        "num_inverters": c.num_inverters,
        "inverter_kw": c.inverter_kw,
        "total_kw": getattr(c, "total_kw", None),
        "efficiency_score": c.efficiency_score,
        "cost_score": c.cost_score,
        "overall_score": c.overall_score,
        "is_recommended": c.is_recommended,
        "rank": c.rank
    } for c in configs]


@app.post("/api/suppliers/{supplier_id}/score")
async def score_supplier(supplier_id: int, scores: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Submit supplier scores"""
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if current_user.role != "admin" and supplier.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not allowed for this supplier")
    
    # Get default weights
    weights = scores.get("weights", {
        "price": 30, "technical": 25, "delivery": 15,
        "warranty": 10, "support": 10, "cert": 10
    })
    
    # Calculate weighted score
    weighted = calculate_supplier_score(
        scores.get("price_score", 50),
        scores.get("technical_score", 50),
        scores.get("delivery_score", 50),
        scores.get("warranty_score", 50),
        scores.get("support_score", 50),
        scores.get("cert_score", 50),
        weights
    )
    
    # Store score
    score = models.SupplierScore(
        supplier_id=supplier_id,
        component_category=scores.get("category", "Battery"),
        price_score=scores.get("price_score", 50),
        technical_score=scores.get("technical_score", 50),
        delivery_score=scores.get("delivery_score", 50),
        warranty_score=scores.get("warranty_score", 50),
        support_score=scores.get("support_score", 50),
        cert_score=scores.get("cert_score", 50),
        weighted_score=weighted
    )
    db.add(score)
    db.commit()
    
    return {"supplier_id": supplier_id, "weighted_score": weighted, "category": scores.get("category")}


@app.get("/api/component-catalog")
async def list_component_catalog(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """List all components in catalog"""
    items = db.query(models.ComponentCatalog).filter(
        models.ComponentCatalog.is_active == True
    ).all()
    return [{
        "id": c.id,
        "category": c.category,
        "name": c.name,
        "description": c.description,
        "voltage_min": c.voltage_min,
        "voltage_max": c.voltage_max,
        "current_rating": c.current_rating,
        "power_rating": c.power_rating,
        "ip_rating": c.ip_rating,
        "efficiency_pct": c.efficiency_pct,
        "cycle_life": c.cycle_life,
        "warranty_yrs": c.warranty_yrs,
        "base_price": c.base_price
    } for c in items]


@app.post("/api/scoring-weights")
async def set_scoring_weights(data: dict, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Set custom scoring weights"""
    category = data.get("component_category", "default")
    scoped_key = f"{current_user.id}:{category}"
    weights = data.get("weights", {})

    sw = db.query(models.ScoringWeight).filter(
        models.ScoringWeight.user_id == scoped_key
    ).first()

    if sw is None:
        sw = models.ScoringWeight(user_id=scoped_key)
        db.add(sw)

    # Map API payload keys to current model fields.
    sw.price_weight = weights.get("price", sw.price_weight or 30)
    sw.technical_weight = weights.get("technical", sw.technical_weight or 25)
    sw.delivery_weight = weights.get("delivery", sw.delivery_weight or 15)
    sw.warranty_weight = weights.get("warranty", sw.warranty_weight or 10)
    sw.support_weight = weights.get("support", sw.support_weight or 10)
    sw.cert_weight = weights.get("cert", sw.cert_weight or 10)

    db.commit()
    return {"category": category, "weights_set": True}


@app.get("/api/scoring-weights")
async def get_scoring_weights(component_category: str = "default", db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    """Get scoring weights for a category"""
    scoped_key = f"{current_user.id}:{component_category}"
    row = db.query(models.ScoringWeight).filter(
        models.ScoringWeight.user_id == scoped_key
    ).first()

    if not row:
        # Return defaults
        return {
            "category": component_category,
            "weights": {
                "price": 30,
                "technical": 25,
                "delivery": 15,
                "warranty": 10,
                "support": 10,
                "cert": 10
            }
        }
    
    return {
        "category": component_category,
        "weights": {
            "price": row.price_weight,
            "technical": row.technical_weight,
            "delivery": row.delivery_weight,
            "warranty": row.warranty_weight,
            "support": row.support_weight,
            "cert": row.cert_weight,
        }
    }


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
