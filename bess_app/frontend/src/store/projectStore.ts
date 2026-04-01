import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Project, ProjectInputs, Configuration } from '../types';

interface ProjectState {
  currentProject: Project | null;
  currentConfiguration: Configuration | null;
  inputs: ProjectInputs;
  setProject: (project: Project) => void;
  setConfiguration: (config: Configuration) => void;
  setInputs: (inputs: Partial<ProjectInputs>) => void;
  clearProject: () => void;
}

const defaultInputs: ProjectInputs = {
  peak_demand_kw: 400,
  daily_energy_kwh: 350,
  num_sites: 1,
  backup_duration_hrs: 2,
  use_case: "EV fast charging",
  grid_peak_tariff: 12,
  grid_offpeak_tariff: 6,
  cycles_per_day: 2,
  project_lifetime_yrs: 12,
  dod_pct: 85,
  battery_module_kwh: 52.25,
  cycle_life: 6000,
  calendar_life_yrs: 10,
  round_trip_efficiency_pct: 90,
  solar_pv_kwp: 500,
  solar_cuf_pct: 19,
  solar_capex_per_kwp: 25000,
  solar_om_per_kwp_yr: 500,
  solar_degradation_pct_yr: 0.5,
  monthly_md_charge_saving: 150000,
  dg_displacement_saving_yr: 50000,
  installation_pct: 8,
  commissioning_pct: 3,
  contingency_pct: 5,
  annual_degradation_pct: 2,
  tariff_escalation_pct: 3,
  dg_fuel_escalation_pct: 5,
  md_escalation_pct: 0,
  min_soh_pct: 80,
  dg_capacity_kw: 250,
  dg_capex: 2500000,
  dg_fuel_cost_yr: 1800000,
  dg_om_yr: 150000,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      currentProject: null,
      currentConfiguration: null,
      inputs: defaultInputs,
      setProject: (project) => set({ currentProject: project }),
      setConfiguration: (config) => set({ currentConfiguration: config }),
      setInputs: (newInputs) => set((state) => ({ inputs: { ...state.inputs, ...newInputs } })),
      clearProject: () => set({ currentProject: null, currentConfiguration: null }),
    }),
    {
      name: 'bess-project-storage',
    }
  )
);
