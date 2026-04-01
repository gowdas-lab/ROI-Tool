"""
API Routes: Analytics
LCOS, ROI, NPV, sensitivity
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import FinancialResult, CashflowYear, Configuration, Project
from core import (
    calculate_capex,
    calculate_opex,
    calculate_lcos,
    calculate_savings,
    calculate_roi,
    generate_cashflow,
    run_sensitivity_analysis,
)

router = APIRouter()


@router.post("/calculate/{configuration_id}")
def calculate_financials(configuration_id: int, db: Session = Depends(get_db)):
    """Calculate financial metrics for a configuration"""
    config = db.query(Configuration).filter(Configuration.id == configuration_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    project = db.query(Project).filter(Project.id == config.project_id).first()
    
    # CAPEX
    capex = calculate_capex(
        num_modules=config.num_modules,
        num_inverters=config.num_inverters,
        solar_pv_kwp=project.solar_pv_kwp,
    )
    
    # OPEX
    opex = calculate_opex(
        battery_kwh=config.total_kwh,
        inverter_kw=config.total_kw,
        solar_kwp=project.solar_pv_kwp,
    )
    
    # LCOS
    lcos = calculate_lcos(
        total_capex=capex["total_capex"],
        total_annual_opex=opex["total_annual_opex"],
        usable_kwh=config.total_kwh * (project.dod_pct / 100),
        project_lifetime_yrs=project.project_lifetime_yrs,
        cycles_per_day=project.cycles_per_day,
        round_trip_efficiency=project.round_trip_efficiency_pct,
        dod_pct=project.dod_pct,
    )
    
    # Savings
    savings = calculate_savings(
        usable_kwh=config.total_kwh * (project.dod_pct / 100),
        cycles_per_day=project.cycles_per_day,
        grid_peak_tariff=project.grid_peak_tariff,
        grid_offpeak_tariff=project.grid_offpeak_tariff,
        round_trip_efficiency=project.round_trip_efficiency_pct,
        monthly_md_charge_saving=150000,  # Default
        dg_displacement_saving_yr=50000,  # Default
    )
    
    # ROI
    roi = calculate_roi(
        total_capex=capex["total_capex"],
        total_annual_savings=savings["total_annual_savings"],
        total_annual_opex=opex["total_annual_opex"],
        project_lifetime_yrs=project.project_lifetime_yrs,
    )
    
    # Save to database
    result = FinancialResult(
        project_id=project.id,
        configuration_id=configuration_id,
        **capex,
        **opex,
        **lcos,
        **savings,
        **roi,
    )
    db.add(result)
    db.commit()
    db.refresh(result)
    
    return {
        "id": result.id,
        "capex": capex,
        "opex": opex,
        "lcos": lcos,
        "savings": savings,
        "roi": roi,
    }


@router.get("/cashflow/{financial_result_id}")
def get_cashflow(financial_result_id: int, db: Session = Depends(get_db)):
    """Get cashflow for a financial result"""
    result = db.query(FinancialResult).filter(FinancialResult.id == financial_result_id).first()
    if not result:
        raise HTTPException(status_code=404, detail="Financial result not found")
    
    cashflow = db.query(CashflowYear).filter(CashflowYear.financial_result_id == financial_result_id).all()
    return cashflow
