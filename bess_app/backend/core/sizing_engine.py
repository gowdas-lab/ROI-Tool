"""
Sizing Engine: kWh → modules → inverters
"""
from typing import Dict, Tuple


def calculate_sizing(
    daily_energy_kwh: float,
    backup_duration_hrs: float,
    dod_pct: float,
    battery_module_kwh: float,
    peak_demand_kw: float,
    inverter_kw_per_unit: float = 125,
) -> Dict:
    """Calculate required modules and inverters"""
    
    # Required energy considering DoD
    usable_ratio = dod_pct / 100
    req_energy_kwh = (daily_energy_kwh * backup_duration_hrs) / usable_ratio
    
    # Modules
    num_modules = int(req_energy_kwh / battery_module_kwh) + 1
    actual_installed_kwh = num_modules * battery_module_kwh
    usable_kwh = actual_installed_kwh * usable_ratio
    
    # Inverters (3-phase, 415V)
    req_power_kw = peak_demand_kw * 1.1  # 10% headroom
    num_inverters = max(1, int((req_power_kw / inverter_kw_per_unit) + 0.5))
    actual_installed_kw = num_inverters * inverter_kw_per_unit
    
    return {
        "req_energy_kwh": round(req_energy_kwh, 2),
        "actual_installed_kwh": round(actual_installed_kwh, 2),
        "usable_kwh": round(usable_kwh, 2),
        "num_modules": num_modules,
        "module_kwh": battery_module_kwh,
        "req_power_kw": round(req_power_kw, 2),
        "actual_installed_kw": round(actual_installed_kw, 2),
        "num_inverters": num_inverters,
        "inverter_kw": inverter_kw_per_unit,
    }


def get_inverter_specs(power_kw: float) -> Dict:
    """Get inverter specifications based on power rating"""
    return {
        "rated_power_kw": power_kw,
        "dc_voltage_range": "400-800V",
        "ac_voltage_v": 415,
        "phases": 3,
        "efficiency_pct": 97.5,
        "ip_rating": "IP65",
        "cooling": "Natural/Forced Air",
    }
