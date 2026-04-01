"""
BESS Optimality API - FastAPI entry point
Modular API routes with core calculation engines
"""
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from database import get_db, engine, Base
from sqlalchemy.orm import Session

# Import models to create tables
from models import (
    Project, Configuration, BOMLineItem, Supplier,
    SupplierComponent, SupplierScore, ScoringWeight,
    ComponentCatalog, FinancialResult, CashflowYear, AuditLog,
    # Legacy
    Calculation, BOMItem, CashflowYearLegacy
)

# Import core engines
from core import (
    calculate_sizing, generate_configurations,
    calculate_supplier_score, get_default_weights,
    calculate_capex, calculate_opex, calculate_lcos,
    calculate_savings, calculate_roi, generate_cashflow,
    build_bom, get_bom_summary
)

# Import API routes
from app.api.v1 import router as api_router

# Create tables
Base.metadata.create_all(bind=engine)

# FastAPI app
app = FastAPI(
    title="BESS Optimality API",
    version="2.0.0",
    description="Battery Energy Storage System optimization with permutation engine and supplier scoring"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include modular API routes
app.include_router(api_router, prefix="/api")

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


# ─── Core Calculation Engine ─────────────────────────────────────────────────

def calculate_bess(inp: BESSInputs) -> dict:
    # --- SIZING ---
    required_energy = inp.peak_demand_kw * inp.backup_duration_hrs
    installed_cap_required = required_energy / (inp.dod_pct / 100)
    num_modules = math.ceil(installed_cap_required / inp.battery_module_kwh)
    actual_installed_kwh = num_modules * inp.battery_module_kwh

    # --- BOM COST (base equipment from data) ---
    battery_unit_price = 520000
    battery_total = num_modules * battery_unit_price

    # AC Side
    num_inverters = math.ceil(inp.peak_demand_kw / 50)
    ac_mcb = num_inverters * 4500
    ac_disconnect = num_inverters * 3500
    ac_spd = num_inverters * 2500
    ac_meter = num_inverters * 8000
    ac_cts = num_inverters * 3 * 600
    ac_panel = 12000
    inverter_cost = num_inverters * 180000
    inv_comm = 5000

    # DC Side
    dc_mcb = num_inverters * 15000
    dc_fuse = num_inverters * 8000
    cable_length = num_inverters * 19
    dc_cable_pos = cable_length * 350
    dc_cable_neg = cable_length * 350
    dc_lugs = cable_length * 80
    dc_spd = 3000
    dc_shunt = 2500

    # EMS
    hmi = 18000
    ems_controller = 0
    ems_gateway = 0

    # Enclosure, Safety, Aux
    enclosure = 24000 * num_inverters
    ups_control = 14000
    firefighting = 35000
    hvac = 45000
    cable_tray = 25000
    cable_misc = 15000
    earthing = 12000
    lighting = 8000
    signage = 3000

    bom_equipment_total = (
        battery_total + ac_mcb + ac_disconnect + ac_spd + ac_meter + ac_cts + ac_panel
        + inverter_cost + inv_comm + dc_mcb + dc_fuse + dc_cable_pos + dc_cable_neg
        + dc_lugs + dc_spd + dc_shunt + hmi + enclosure + ups_control + firefighting
        + hvac + cable_tray + cable_misc + earthing + lighting + signage
    )

    installation_cost = bom_equipment_total * (inp.installation_pct / 100)
    commissioning_cost = bom_equipment_total * (inp.commissioning_pct / 100)
    contingency_cost = (bom_equipment_total + installation_cost + commissioning_cost) * (inp.contingency_pct / 100)
    total_capex = bom_equipment_total + installation_cost + commissioning_cost + contingency_cost

    # --- OPEX ---
    annual_om = total_capex * 0.015
    insurance = total_capex * 0.005
    monitoring = 10000
    total_annual_opex = annual_om + insurance + monitoring
    lifetime_opex = total_annual_opex * inp.project_lifetime_yrs

    # --- LCOS ---
    annual_cycles = inp.cycles_per_day * 365
    total_cycles = annual_cycles * inp.calendar_life_yrs
    eta = inp.round_trip_efficiency_pct / 100
    dod = inp.dod_pct / 100
    energy_throughput = actual_installed_kwh * dod * eta * total_cycles
    lcos = (total_capex + lifetime_opex) / energy_throughput if energy_throughput > 0 else 0

    # --- SAVINGS ---
    daily_dischargeable = actual_installed_kwh * dod * eta
    arbitrage_per_kwh = inp.grid_peak_tariff - inp.grid_offpeak_tariff
    daily_arbitrage = daily_dischargeable * arbitrage_per_kwh
    annual_arbitrage = daily_arbitrage * 365
    annual_md_saving = inp.monthly_md_charge_saving * 12
    total_annual_savings = annual_arbitrage + annual_md_saving + inp.dg_displacement_saving_yr

    # --- ROI ---
    net_annual_benefit = total_annual_savings - total_annual_opex
    simple_payback = total_capex / net_annual_benefit if net_annual_benefit > 0 else 999
    cumulative_10yr = sum([net_annual_benefit * y for y in range(1, 11)])
    roi_10yr = ((cumulative_10yr) / total_capex) * 100 if total_capex > 0 else 0

    # --- YEAR-BY-YEAR CASHFLOW ---
    cashflow_years = []
    cumulative = -total_capex
    for yr in range(1, int(inp.project_lifetime_yrs) + 1):
        soh = max(0, 1 - (inp.annual_degradation_pct / 100) * (yr - 1))
        usable_cap = actual_installed_kwh * soh
        tariff_factor = (1 + inp.tariff_escalation_pct / 100) ** (yr - 1)
        degraded_arbitrage = usable_cap * dod * eta * arbitrage_per_kwh * tariff_factor * 365
        md_factor = (1 + inp.md_escalation_pct / 100) ** (yr - 1)
        md_saving_yr = annual_md_saving * md_factor
        dg_factor = (1 + inp.dg_fuel_escalation_pct / 100) ** (yr - 1)
        dg_saving_yr = inp.dg_displacement_saving_yr * dg_factor
        total_saving_yr = degraded_arbitrage + md_saving_yr + dg_saving_yr
        net_yr = total_saving_yr - total_annual_opex
        cumulative += net_yr
        cashflow_years.append({
            "year": yr,
            "soh_pct": round(soh * 100, 1),
            "usable_capacity_kwh": round(usable_cap, 0),
            "arbitrage_saving": round(degraded_arbitrage, 0),
            "md_dg_saving": round(md_saving_yr + dg_saving_yr, 0),
            "total_saving": round(total_saving_yr, 0),
            "net_benefit": round(net_yr, 0),
            "cumulative_net": round(cumulative, 0),
        })

    # --- SOLAR ---
    solar_annual_gen = inp.solar_pv_kwp * (inp.solar_cuf_pct / 100) * 8760
    solar_capex = inp.solar_pv_kwp * inp.solar_capex_per_kwp
    solar_annual_om = inp.solar_pv_kwp * inp.solar_om_per_kwp_yr
    solar_lifetime_cost = solar_capex + solar_annual_om * inp.calendar_life_yrs
    solar_throughput = solar_annual_gen * inp.calendar_life_yrs * (1 - inp.solar_degradation_pct_yr / 100 * 5)
    lcos_solar = solar_lifetime_cost / solar_throughput if solar_throughput > 0 else 0

    # --- DG ---
    dg_annual_cost = inp.dg_fuel_cost_yr + inp.dg_om_yr
    dg_lifetime = inp.dg_capex + dg_annual_cost * inp.calendar_life_yrs
    dg_gen_kwh_yr = inp.dg_capacity_kw * 8 * 365  # assume 8 hrs/day
    dg_throughput = dg_gen_kwh_yr * inp.calendar_life_yrs
    lcos_dg = dg_lifetime / dg_throughput if dg_throughput > 0 else 0

    # Combined BESS+Solar
    combined_capex = total_capex + solar_capex
    combined_opex_yr = total_annual_opex + solar_annual_om
    combined_lifetime = combined_capex + combined_opex_yr * inp.calendar_life_yrs
    combined_throughput = energy_throughput + solar_throughput
    lcos_bess_solar = combined_lifetime / combined_throughput if combined_throughput > 0 else 0

    # --- SENSITIVITY TABLE ---
    bom_multipliers = [0.80, 0.90, 1.00, 1.10, 1.20, 1.30]
    tariffs = [8, 10, 12, 14, 16, 18]
    sensitivity = []
    for t in tariffs:
        row = {"tariff": t, "paybacks": {}}
        for m in bom_multipliers:
            scaled_capex = bom_equipment_total * m + installation_cost * m + commissioning_cost * m + contingency_cost * m
            arb = daily_dischargeable * (t - inp.grid_offpeak_tariff) * 365
            net = arb + annual_md_saving + inp.dg_displacement_saving_yr - total_annual_opex
            pb = round(scaled_capex / net, 1) if net > 0 else 99
            row["paybacks"][str(m)] = pb
        sensitivity.append(row)

    # --- LCOS MATRIX (DoD x Cycle Life) ---
    dods = [70, 80, 85, 90, 95]
    cycle_lives = [2000, 3000, 4000, 5000, 6000]
    lcos_matrix = []
    for cl in cycle_lives:
        row = {"cycle_life": cl, "values": {}}
        for d in dods:
            d_frac = d / 100
            e_thru = actual_installed_kwh * d_frac * eta * cl * inp.cycles_per_day
            lcos_val = (total_capex + lifetime_opex) / e_thru if e_thru > 0 else 0
            row["values"][str(d)] = round(lcos_val, 2)
        lcos_matrix.append(row)

    # --- COMPARISON ---
    comparison = {
        "BESS Only": {
            "lcos": round(lcos, 2),
            "npv_lcos": round(lcos * 0.82, 2),
            "lifetime_cost": round(total_capex + lifetime_opex, 0),
            "energy_throughput_kwh": round(energy_throughput, 0),
            "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos, 2),
        },
        "Solar Only": {
            "lcos": round(lcos_solar, 2),
            "npv_lcos": round(lcos_solar * 0.82, 2),
            "lifetime_cost": round(solar_lifetime_cost, 0),
            "energy_throughput_kwh": round(solar_throughput, 0),
            "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos_solar, 2),
        },
        "DG Only": {
            "lcos": round(lcos_dg, 2),
            "npv_lcos": round(lcos_dg * 0.82, 2),
            "lifetime_cost": round(dg_lifetime, 0),
            "energy_throughput_kwh": round(dg_throughput, 0),
            "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos_dg, 2),
        },
        "BESS + Solar": {
            "lcos": round(lcos_bess_solar, 2),
            "npv_lcos": round(lcos_bess_solar * 0.82, 2),
            "lifetime_cost": round(combined_lifetime, 0),
            "energy_throughput_kwh": round(combined_throughput, 0),
            "lcos_saving_vs_grid": round(inp.grid_peak_tariff - lcos_bess_solar, 2),
        },
    }

    # --- BOM ITEMS ---
    bom_items = [
        {"id": 1, "category": "Battery System", "description": "Battery Module/Pack – Complete", "qty": num_modules, "unit": "system", "spec": f"51.2V, 1020Ah, {inp.battery_module_kwh}kWh", "unit_price": battery_unit_price, "line_total": battery_total},
        {"id": 5, "category": "AC Side", "description": "AC Main Circuit Breaker", "qty": num_inverters, "unit": "pcs", "spec": "125A, 400–690VAC", "unit_price": 4500, "line_total": ac_mcb},
        {"id": 6, "category": "AC Side", "description": "AC Disconnect Switch", "qty": num_inverters, "unit": "pcs", "spec": "125A, 400–690VAC", "unit_price": 3500, "line_total": ac_disconnect},
        {"id": 7, "category": "AC Side", "description": "AC Surge Protection Device", "qty": num_inverters, "unit": "pcs", "spec": "400VAC, 40kA", "unit_price": 2500, "line_total": ac_spd},
        {"id": 8, "category": "AC Side", "description": "AC Power Meter", "qty": num_inverters, "unit": "pcs", "spec": "0.5S class, Modbus", "unit_price": 8000, "line_total": ac_meter},
        {"id": 11, "category": "Inverter/PCS", "description": "Hybrid Inverter 50kW", "qty": num_inverters, "unit": "pcs", "spec": "50kW, 48–58V DC, 3-ph 400VAC", "unit_price": 180000, "line_total": inverter_cost},
        {"id": 13, "category": "DC Side", "description": "DC Main Circuit Breaker", "qty": num_inverters, "unit": "pcs", "spec": "800A, 80–100VDC", "unit_price": 15000, "line_total": dc_mcb},
        {"id": 14, "category": "DC Side", "description": "DC Fused Disconnect", "qty": num_inverters, "unit": "pcs", "spec": "630–800A, 80VDC", "unit_price": 8000, "line_total": dc_fuse},
        {"id": 15, "category": "DC Cabling", "description": "DC Power Cable +ve", "qty": cable_length, "unit": "m", "spec": "240mm², 1000VDC, red", "unit_price": 350, "line_total": dc_cable_pos},
        {"id": 16, "category": "DC Cabling", "description": "DC Power Cable -ve", "qty": cable_length, "unit": "m", "spec": "240mm², 1000VDC, black", "unit_price": 350, "line_total": dc_cable_neg},
        {"id": 20, "category": "EMS", "description": "EMS Controller / Software", "qty": 1, "unit": "system", "spec": "Supports 50–500kWh", "unit_price": 0, "line_total": 0},
        {"id": 22, "category": "EMS", "description": "HMI Touchscreen Panel", "qty": 1, "unit": "pcs", "spec": "10–12 inch, IP65", "unit_price": 18000, "line_total": hmi},
        {"id": 39, "category": "Auxiliary", "description": "UPS for Controls 24VDC 500VA", "qty": 1, "unit": "pcs", "spec": "APC BE600M1", "unit_price": 14000, "line_total": ups_control},
        {"id": 44, "category": "Enclosure", "description": "Control Cabinet 800×600×300", "qty": num_inverters, "unit": "pcs", "spec": "IP66", "unit_price": 24000, "line_total": enclosure},
    ]

    return {
        "sizing": {
            "required_energy_kwh": round(required_energy, 1),
            "installed_cap_required_kwh": round(installed_cap_required, 1),
            "num_modules": num_modules,
            "actual_installed_kwh": round(actual_installed_kwh, 2),
            "num_inverters": num_inverters,
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
            "daily_dischargeable_kwh": round(daily_dischargeable, 1),
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
            "cumulative_10yr_net": round(cumulative_10yr, 0),
            "roi_10yr_pct": round(roi_10yr, 1),
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
async def calculate(inp: BESSInputs, db: Session = Depends(get_db)):
    result = calculate_bess(inp)
    # Store in DB
    record = crud.create_calculation(db, inp.dict(), result)
    return {"id": record.id, "timestamp": record.created_at.isoformat(), **result}


@app.get("/api/calculations")
async def list_calculations(limit: int = 20, db: Session = Depends(get_db)):
    records = crud.list_calculations(db, limit)
    return [
        {
            "id": r.id,
            "timestamp": r.created_at.isoformat(),
            "total_capex": r.total_capex,
            "lcos": r.lcos,
            "payback_yrs": r.payback_yrs,
            "use_case": r.use_case,
        }
        for r in records
    ]


@app.get("/api/calculations/{calc_id}")
async def get_calculation(calc_id: int, db: Session = Depends(get_db)):
    record = crud.get_calculation(db, calc_id)
    if not record:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return {
        "id": record.id,
        "timestamp": record.created_at.isoformat(),
        "inputs": record.inputs_json,
        "results": record.results_json,
    }


@app.get("/api/bom/{calc_id}")
async def get_bom(calc_id: int, db: Session = Depends(get_db)):
    items = crud.get_bom_items(db, calc_id)
    if not items:
        raise HTTPException(status_code=404, detail="BOM not found")
    return [{"id": i.bom_item_id, "category": i.category, "description": i.description,
             "qty": i.qty, "unit": i.unit, "spec": i.spec,
             "unit_price": i.unit_price, "line_total": i.line_total} for i in items]


@app.get("/api/suppliers")
async def list_suppliers(db: Session = Depends(get_db)):
    suppliers = crud.list_suppliers(db)
    return suppliers


# ─── Permutation & Combination Engine ────────────────────────────────────────

MODULE_SIZES = [25, 50, 52.25, 100, 150]  # kWh options
INVERTER_SIZES = [25, 50, 100, 150]  # kW options

def generate_configurations(inp: BESSInputs) -> List[dict]:
    """Generate ranked kW × kWh × module combos"""
    configs = []
    required_energy = inp.peak_demand_kw * inp.backup_duration_hrs
    
    for module_kwh in MODULE_SIZES:
        for inv_kw in INVERTER_SIZES:
            # Skip invalid combos
            if inv_kw < inp.peak_demand_kw * 0.5:
                continue
                
            installed_cap_required = required_energy / (inp.dod_pct / 100)
            num_modules = math.ceil(installed_cap_required / module_kwh)
            actual_kwh = num_modules * module_kwh
            num_inverters = math.ceil(inp.peak_demand_kw / inv_kw)
            
            # Calculate scores
            efficiency_score = min(100, (actual_kwh / installed_cap_required) * 100)
            cost_score = 100 - ((num_modules * 500000 + num_inverters * 180000) / 100000)
            
            # Weighted overall score
            overall_score = efficiency_score * 0.6 + cost_score * 0.4
            
            configs.append({
                "num_modules": num_modules,
                "module_kwh": module_kwh,
                "total_kwh": actual_kwh,
                "num_inverters": num_inverters,
                "inverter_kw": inv_kw,
                "total_kw": num_inverters * inv_kw,
                "efficiency_score": round(efficiency_score, 1),
                "cost_score": round(cost_score, 1),
                "overall_score": round(overall_score, 1)
            })
    
    # Sort by overall score descending
    configs.sort(key=lambda x: x["overall_score"], reverse=True)
    
    # Assign ranks and mark recommended
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
async def create_project(data: dict, db: Session = Depends(get_db)):
    """Create new project with energy inputs"""
    project = models.Project(
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
async def list_projects(limit: int = 20, db: Session = Depends(get_db)):
    """List all projects"""
    projects = db.query(models.Project).order_by(models.Project.created_at.desc()).limit(limit).all()
    return [{"id": p.id, "name": p.name, "use_case": p.use_case, 
             "peak_kw": p.peak_demand_kw, "created_at": p.created_at.isoformat()} for p in projects]


@app.post("/api/projects/{project_id}/configurations")
async def generate_project_configs(project_id: int, db: Session = Depends(get_db)):
    """Generate configuration permutations for a project"""
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
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
async def get_project_configs(project_id: int, db: Session = Depends(get_db)):
    """Get configurations for a project"""
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
        "efficiency_score": c.efficiency_score,
        "cost_score": c.cost_score,
        "overall_score": c.overall_score,
        "is_recommended": c.is_recommended,
        "rank": c.rank
    } for c in configs]


@app.post("/api/suppliers/{supplier_id}/score")
async def score_supplier(supplier_id: int, scores: dict, db: Session = Depends(get_db)):
    """Submit supplier scores"""
    supplier = db.query(models.Supplier).filter(models.Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
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
async def list_component_catalog(db: Session = Depends(get_db)):
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
async def set_scoring_weights(data: dict, db: Session = Depends(get_db)):
    """Set custom scoring weights"""
    category = data.get("component_category", "default")
    
    for criterion, weight in data.get("weights", {}).items():
        sw = models.ScoringWeight(
            component_category=category,
            criterion=criterion,
            weight_pct=weight,
            is_default=False
        )
        db.add(sw)
    
    db.commit()
    return {"category": category, "weights_set": True}


@app.get("/api/scoring-weights")
async def get_scoring_weights(component_category: str = "default", db: Session = Depends(get_db)):
    """Get scoring weights for a category"""
    weights = db.query(models.ScoringWeight).filter(
        models.ScoringWeight.component_category == component_category
    ).all()
    
    if not weights:
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
        "weights": {w.criterion: w.weight_pct for w in weights}
    }


@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}
