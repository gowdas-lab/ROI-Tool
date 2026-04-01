"""
Permutation Engine: itertools combos + ranking
"""
from itertools import product
from typing import List, Dict, Tuple
import math


def generate_configurations(
    req_energy_kwh: float,
    req_power_kw: float,
    module_options: List[float] = None,
    inverter_options: List[float] = None,
) -> List[Dict]:
    """Generate ranked battery module/inverter combinations"""
    
    if module_options is None:
        module_options = [26.4, 52.25, 100.0]  # Common module sizes
    
    if inverter_options is None:
        inverter_options = [50, 75, 100, 125, 150]  # Common inverter sizes
    
    configs = []
    
    for module_kwh in module_options:
        for inverter_kw in inverter_options:
            # Calculate modules needed
            num_modules = max(1, math.ceil(req_energy_kwh / module_kwh))
            total_kwh = num_modules * module_kwh
            
            # Calculate inverters needed
            num_inverters = max(1, math.ceil(req_power_kw / inverter_kw))
            total_kw = num_inverters * inverter_kw
            
            # Efficiency score: how close to target (higher is better)
            energy_eff = 100 - min(100, abs(total_kwh - req_energy_kwh) / req_energy_kwh * 100)
            power_eff = 100 - min(100, abs(total_kw - req_power_kw) / req_power_kw * 100)
            efficiency_score = (energy_eff + power_eff) / 2
            
            # Cost score: lower module count and inverter count is cheaper
            cost_score = 100 - (num_modules * 0.5 + num_inverters * 2)
            
            # Overall score
            overall_score = efficiency_score * 0.6 + cost_score * 0.4
            
            configs.append({
                "module_kwh": module_kwh,
                "num_modules": num_modules,
                "total_kwh": round(total_kwh, 2),
                "inverter_kw": inverter_kw,
                "num_inverters": num_inverters,
                "total_kw": round(total_kw, 2),
                "efficiency_score": round(efficiency_score, 1),
                "cost_score": round(max(0, cost_score), 1),
                "overall_score": round(overall_score, 1),
            })
    
    # Sort by overall score descending
    configs.sort(key=lambda x: x["overall_score"], reverse=True)
    
    # Add ranks and recommendation
    for i, config in enumerate(configs):
        config["rank"] = i + 1
        config["is_recommended"] = (i == 0)
    
    return configs


def filter_by_constraints(
    configs: List[Dict],
    max_modules: int = None,
    max_inverters: int = None,
    min_efficiency: float = None,
) -> List[Dict]:
    """Filter configurations by constraints"""
    filtered = configs
    
    if max_modules:
        filtered = [c for c in filtered if c["num_modules"] <= max_modules]
    
    if max_inverters:
        filtered = [c for c in filtered if c["num_inverters"] <= max_inverters]
    
    if min_efficiency:
        filtered = [c for c in filtered if c["efficiency_score"] >= min_efficiency]
    
    return filtered
