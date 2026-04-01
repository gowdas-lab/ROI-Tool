"""
Financial Models: ROI, LCOS, NPV, degradation
"""
import math
from typing import List, Dict, Tuple


def calculate_capex(
    num_modules: int,
    num_inverters: int,
    battery_cost_per_kwh: float = 8000,
    inverter_cost_per_kw: float = 3500,
    solar_pv_kwp: float = 0,
    solar_cost_per_kwp: float = 25000,
    installation_pct: float = 8,
    commissioning_pct: float = 3,
    contingency_pct: float = 5,
) -> Dict[str, float]:
    """Calculate CAPEX breakdown"""
    
    # Battery cost
    battery_cost = num_modules * battery_cost_per_kwh
    
    # Inverter cost
    inverter_cost = num_inverters * inverter_cost_per_kw
    
    # Solar cost (if applicable)
    solar_cost = solar_pv_kwp * solar_cost_per_kwp
    
    # BMS (approx 10% of battery cost)
    bms_cost = battery_cost * 0.10
    
    # Soft costs
    installation = (battery_cost + inverter_cost + bms_cost) * (installation_pct / 100)
    commissioning = (battery_cost + inverter_cost + bms_cost) * (commissioning_pct / 100)
    contingency = (battery_cost + inverter_cost + bms_cost) * (contingency_pct / 100)
    
    total_capex = battery_cost + inverter_cost + solar_cost + bms_cost + installation + commissioning + contingency
    
    return {
        "battery": round(battery_cost, 2),
        "inverter": round(inverter_cost, 2),
        "solar": round(solar_cost, 2),
        "bms": round(bms_cost, 2),
        "installation": round(installation, 2),
        "commissioning": round(commissioning, 2),
        "contingency": round(contingency, 2),
        "total_capex": round(total_capex, 2),
    }


def calculate_opex(
    battery_kwh: float,
    inverter_kw: float,
    solar_kwp: float = 0,
    om_per_kwh_yr: float = 150,
    om_inverter_pct: float = 1.5,
    om_solar_per_kwp_yr: float = 500,
) -> Dict[str, float]:
    """Calculate annual OPEX"""
    
    annual_battery_om = battery_kwh * om_per_kwh_yr
    annual_inverter_om = (inverter_kw * om_inverter_pct / 100) * 100000  # Rough estimate
    annual_solar_om = solar_kwp * om_solar_per_kwp_yr
    
    return {
        "annual_battery_om": round(annual_battery_om, 2),
        "annual_inverter_om": round(annual_inverter_om, 2),
        "annual_solar_om": round(annual_solar_om, 2),
        "total_annual_opex": round(annual_battery_om + annual_inverter_om + annual_solar_om, 2),
    }


def calculate_lcos(
    total_capex: float,
    total_annual_opex: float,
    usable_kwh: float,
    project_lifetime_yrs: float,
    cycles_per_day: float,
    round_trip_efficiency: float,
    dod_pct: float,
) -> Dict[str, float]:
    """Calculate Levelized Cost of Storage (LCOS)"""
    
    # Energy throughput over lifetime
    annual_throughput = usable_kwh * cycles_per_day * 365 * (round_trip_efficiency / 100)
    lifetime_throughput = annual_throughput * project_lifetime_yrs
    
    # Total OPEX over lifetime
    lifetime_opex = total_annual_opex * project_lifetime_yrs
    
    # Replacement cost (simplified)
    replacement_cost = total_capex * 0.3  # Assume 30% replacement at mid-life
    
    # Total lifetime cost
    lifetime_cost = total_capex + lifetime_opex + replacement_cost
    
    # LCOS
    lcos = lifetime_cost / lifetime_throughput if lifetime_throughput > 0 else 0
    
    return {
        "lcos_inr_per_kwh": round(lcos, 2),
        "energy_throughput_kwh": round(lifetime_throughput, 2),
        "lifetime_cost": round(lifetime_cost, 2),
    }


def calculate_savings(
    usable_kwh: float,
    cycles_per_day: float,
    grid_peak_tariff: float,
    grid_offpeak_tariff: float,
    round_trip_efficiency: float,
    monthly_md_charge_saving: float,
    dg_displacement_saving_yr: float,
) -> Dict[str, float]:
    """Calculate annual savings"""
    
    # Arbitrage savings
    daily_arbitrage = usable_kwh * cycles_per_day * (grid_peak_tariff - grid_offpeak_tariff) * (round_trip_efficiency / 100)
    annual_arbitrage = daily_arbitrage * 365
    
    # MD charge saving
    annual_md_saving = monthly_md_charge_saving * 12
    
    # DG displacement
    dg_displacement = dg_displacement_saving_yr
    
    total_savings = annual_arbitrage + annual_md_saving + dg_displacement
    
    return {
        "annual_arbitrage": round(annual_arbitrage, 2),
        "annual_md_saving": round(annual_md_saving, 2),
        "dg_displacement": round(dg_displacement, 2),
        "total_annual_savings": round(total_savings, 2),
    }


def calculate_roi(
    total_capex: float,
    total_annual_savings: float,
    total_annual_opex: float,
    project_lifetime_yrs: float,
) -> Dict[str, float]:
    """Calculate ROI metrics"""
    
    net_annual_benefit = total_annual_savings - total_annual_opex
    
    # Simple payback
    simple_payback = total_capex / net_annual_benefit if net_annual_benefit > 0 else float('inf')
    
    # Cumulative 10-year net
    cumulative_10yr = net_annual_benefit * 10
    
    # 10-year ROI percentage
    roi_10yr = ((cumulative_10yr - total_capex) / total_capex) * 100 if total_capex > 0 else 0
    
    # NPV (simplified, 8% discount)
    npv = -total_capex
    for year in range(1, int(project_lifetime_yrs) + 1):
        npv += net_annual_benefit / ((1.08) ** year)
    
    return {
        "net_annual_benefit": round(net_annual_benefit, 2),
        "simple_payback_yrs": round(simple_payback, 1),
        "cumulative_10yr_net": round(cumulative_10yr, 2),
        "roi_10yr_pct": round(roi_10yr, 1),
        "npv_8pct": round(npv, 2),
    }


def generate_cashflow(
    total_capex: float,
    net_annual_benefit: float,
    total_annual_opex: float,
    project_lifetime_yrs: int,
    annual_degradation_pct: float,
) -> List[Dict]:
    """Generate year-by-year cashflow with degradation"""
    
    cashflow = []
    cumulative = -total_capex
    
    for year in range(1, project_lifetime_yrs + 1):
        # Degradation factor
        degradation_factor = (1 - annual_degradation_pct / 100) ** (year - 1)
        soh = 100 * degradation_factor
        
        # Adjusted savings and costs
        adjusted_benefit = net_annual_benefit * degradation_factor
        adjusted_opex = total_annual_opex * (1 + 0.03) ** (year - 1)  # 3% escalation
        
        net = adjusted_benefit - adjusted_opex
        cumulative += net
        
        cashflow.append({
            "year": year,
            "soh_pct": round(soh, 1),
            "opex": round(adjusted_opex, 2),
            "savings": round(adjusted_benefit, 2),
            "net": round(net, 2),
            "cumulative_net": round(cumulative, 2),
        })
    
    return cashflow
