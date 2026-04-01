"""
Sensitivity Analysis: BOM cost × tariff matrix
"""
from typing import Dict, List
import copy


def run_sensitivity_analysis(
    base_inputs: Dict,
    base_result: Dict,
) -> Dict[str, Dict[str, float]]:
    """Run sensitivity analysis on key parameters"""
    
    sensitivities = {}
    
    # Battery cost variation (±20%)
    sensitivities["battery_cost"] = {}
    for variation in [-20, -10, 0, 10, 20]:
        factor = 1 + variation / 100
        adjusted_capex = base_result["capex"]["total_capex"] * factor
        sensitivities["battery_cost"][f"{variation:+d}%"] = round(adjusted_capex, 2)
    
    # Tariff variation (±30%)
    sensitivities["tariff"] = {}
    for variation in [-30, -15, 0, 15, 30]:
        factor = 1 + variation / 100
        adjusted_savings = base_result["savings"]["total_annual_savings"] * factor
        sensitivities["tariff"][f"{variation:+d}%"] = round(adjusted_savings, 2)
    
    # DoD variation (70% to 95%)
    sensitivities["dod"] = {}
    for dod in [70, 80, 85, 90, 95]:
        # Approximate impact on usable energy
        base_dod = base_inputs.get("dod_pct", 85)
        factor = dod / base_dod
        adjusted_throughput = base_result["lcos"]["energy_throughput_kwh"] * factor
        sensitivities["dod"][f"{dod}%"] = round(adjusted_throughput, 2)
    
    # Cycles per day (1 to 3)
    sensitivities["cycles"] = {}
    for cycles in [1, 1.5, 2, 2.5, 3]:
        factor = cycles / base_inputs.get("cycles_per_day", 2)
        adjusted_arbitrage = base_result["savings"]["annual_arbitrage"] * factor
        sensitivities["cycles"][f"{cycles}"] = round(adjusted_arbitrage, 2)
    
    return sensitivities


def get_sensitivity_matrix(
    x_param: str,
    y_param: str,
    x_range: List[float],
    y_range: List[float],
    base_inputs: Dict,
    calculator_func,
) -> List[List[float]]:
    """Generate 2D sensitivity matrix"""
    
    matrix = []
    
    for y in y_range:
        row = []
        for x in x_range:
            # Create modified inputs
            modified = copy.deepcopy(base_inputs)
            modified[x_param] = x
            modified[y_param] = y
            
            # Calculate result
            try:
                result = calculator_func(modified)
                row.append(result.get("lcos", {}).get("lcos_inr_per_kwh", 0))
            except:
                row.append(0)
        
        matrix.append(row)
    
    return matrix
