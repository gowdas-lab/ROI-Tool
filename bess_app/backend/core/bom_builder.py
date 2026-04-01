"""
BOM Builder: BOM line-item assembly
"""
from typing import List, Dict


def build_bom(
    num_modules: int,
    module_kwh: float,
    num_inverters: int,
    inverter_kw: float,
    use_case: str = "Industrial BESS",
) -> List[Dict]:
    """Build detailed BOM for a configuration"""
    
    bom = []
    
    # Battery modules
    battery_cost_per_kwh = 8000
    battery_total = num_modules * module_kwh * battery_cost_per_kwh
    bom.append({
        "id": 1,
        "category": "Battery",
        "description": f"LFP Battery Module {module_kwh}kWh",
        "qty": num_modules,
        "unit": "module",
        "spec": f"{module_kwh}kWh, 3.2V LFP, 8000 cycles, 10 yr warranty",
        "unit_price": module_kwh * battery_cost_per_kwh,
        "line_total": battery_total,
    })
    
    # Battery rack/cabinet (1 per ~100kWh)
    racks = max(1, (num_modules * module_kwh) // 100 + 1)
    rack_cost = 75000
    bom.append({
        "id": 2,
        "category": "Rack",
        "description": "Battery Cabinet with Cooling",
        "qty": racks,
        "unit": "cabinet",
        "spec": "IP55, Active cooling, Fire suppression ready",
        "unit_price": rack_cost,
        "line_total": racks * rack_cost,
    })
    
    # Inverters
    inverter_cost_per_kw = 3500
    inverter_total = num_inverters * inverter_kw * inverter_cost_per_kw
    bom.append({
        "id": 3,
        "category": "Inverter",
        "description": f"Power Conversion System {inverter_kw}kW",
        "qty": num_inverters,
        "unit": "unit",
        "spec": f"{inverter_kw}kW, 3-phase, 415V, 97.5% efficiency",
        "unit_price": inverter_kw * inverter_cost_per_kw,
        "line_total": inverter_total,
    })
    
    # BMS
    bms_cost = battery_total * 0.10
    bom.append({
        "id": 4,
        "category": "BMS",
        "description": "Battery Management System",
        "qty": 1,
        "unit": "set",
        "spec": "Cell balancing, SOC/SOH monitoring, CAN/Modbus",
        "unit_price": bms_cost,
        "line_total": bms_cost,
    })
    
    # Energy Management System
    ems_cost = 150000
    bom.append({
        "id": 5,
        "category": "EMS",
        "description": "Energy Management System",
        "qty": 1,
        "unit": "set",
        "spec": "Arbitrage control, scheduling, reporting",
        "unit_price": ems_cost,
        "line_total": ems_cost,
    })
    
    # Switchgear
    switchgear_cost = 125000
    bom.append({
        "id": 6,
        "category": "Switchgear",
        "description": "AC & DC Switchgear",
        "qty": 1,
        "unit": "set",
        "spec": "ACB, MCCB, DC breakers, fuses",
        "unit_price": switchgear_cost,
        "line_total": switchgear_cost,
    })
    
    # Cables & Accessories
    cable_cost = 50000
    bom.append({
        "id": 7,
        "category": "Accessories",
        "description": "HV Cables, Busbar, Connectors",
        "qty": 1,
        "unit": "lot",
        "spec": "Fire retardant, UV resistant",
        "unit_price": cable_cost,
        "line_total": cable_cost,
    })
    
    return bom


def get_bom_summary(bom: List[Dict]) -> Dict:
    """Get BOM summary statistics"""
    
    total = sum(item["line_total"] for item in bom)
    categories = list(set(item["category"] for item in bom))
    
    return {
        "total_bom": round(total, 2),
        "num_line_items": len(bom),
        "categories": categories,
    }
