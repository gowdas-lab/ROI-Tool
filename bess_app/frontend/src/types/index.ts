export interface Project {
  id: number;
  name: string;
  created_at: string;
  inputs: ProjectInputs;
}

export interface ProjectInputs {
  peak_demand_kw: number;
  daily_energy_kwh: number;
  num_sites: number;
  backup_duration_hrs: number;
  use_case: string;
  grid_peak_tariff: number;
  grid_offpeak_tariff: number;
  cycles_per_day: number;
  project_lifetime_yrs: number;
  dod_pct: number;
  battery_module_kwh: number;
  cycle_life: number;
  calendar_life_yrs: number;
  round_trip_efficiency_pct: number;
  solar_pv_kwp: number;
  solar_cuf_pct: number;
  solar_capex_per_kwp: number;
  solar_om_per_kwp_yr: number;
  solar_degradation_pct_yr: number;
  monthly_md_charge_saving: number;
  dg_displacement_saving_yr: number;
  installation_pct: number;
  commissioning_pct: number;
  contingency_pct: number;
  annual_degradation_pct: number;
  tariff_escalation_pct: number;
  dg_fuel_escalation_pct: number;
  md_escalation_pct: number;
  min_soh_pct: number;
  dg_capacity_kw: number;
  dg_capex: number;
  dg_fuel_cost_yr: number;
  dg_om_yr: number;
}

export interface Configuration {
  id: number;
  project_id: number;
  rank: number;
  num_modules: number;
  module_kwh: number;
  total_kwh: number;
  num_inverters: number;
  inverter_kw: number;
  total_kw: number;
  efficiency_score: number;
  cost_score: number;
  overall_score: number;
  is_recommended: boolean;
}

export interface BomItem {
  id: number;
  category: string;
  description: string;
  qty: number;
  unit: string;
  spec: string;
  unit_price: number;
  line_total: number;
  supplier_id?: number;
  supplier_name?: string;
}

export interface BomSummary {
  total_bom: number;
  num_line_items: number;
  categories: string[];
}

export interface Supplier {
  id: number;
  name: string;
  component_category: string;
  country: string;
  tier: string;
  certifications: string[];
  price_score?: number;
  technical_score?: number;
  delivery_score?: number;
  warranty_score?: number;
  support_score?: number;
  certification_score?: number;
  weighted_score?: number;
}

export interface ScoringWeights {
  price: number;
  technical: number;
  delivery: number;
  warranty: number;
  support: number;
  cert: number;
}

export interface SizingResult {
  actual_installed_kwh: number;
  num_modules: number;
  num_inverters: number;
  req_energy_kwh: number;
  req_power_kw: number;
}

export interface CapexResult {
  battery: number;
  inverter: number;
  solar: number;
  bms: number;
  installation: number;
  commissioning: number;
  contingency: number;
  total_capex: number;
}

export interface OpexResult {
  annual_battery_om: number;
  annual_inverter_om: number;
  annual_solar_om: number;
  total_annual_opex: number;
}

export interface LcosResult {
  lcos_inr_per_kwh: number;
  lcos_pv_adjusted: number;
  energy_throughput_kwh: number;
  lifetime_cost: number;
}

export interface SavingsResult {
  annual_arbitrage: number;
  annual_md_saving: number;
  dg_displacement: number;
  total_annual_savings: number;
  lcos_vs_grid_peak: number;
  lcos_vs_grid_avg: number;
}

export interface RoiResult {
  net_annual_benefit: number;
  simple_payback_yrs: number;
  roi_10yr_pct: number;
  cumulative_10yr_net: number;
  npv_8pct: number;
  irr_pct: number;
}

export interface CashflowYear {
  year: number;
  soh_pct: number;
  throughput_kwh: number;
  opex: number;
  savings: number;
  net: number;
  cumulative_net: number;
}

export interface CalculationResult {
  id: number;
  sizing: SizingResult;
  capex: CapexResult;
  opex: OpexResult;
  lcos: LcosResult;
  savings: SavingsResult;
  roi: RoiResult;
  cashflow_years: CashflowYear[];
  bom_items: BomItem[];
  bom_summary: BomSummary;
  sensitivity?: Record<string, Record<string, number>>;
  inputs: ProjectInputs;
}
