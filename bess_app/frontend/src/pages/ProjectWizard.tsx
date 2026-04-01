import { useState } from 'react';
import { useProjectStore } from '../store';

// Sub-Megawatt only configuration
type SystemConfig = 'bess-only' | 'bess-solar' | 'bess-solar-dg' | 'solar-bess-dg' | null;

// Empty defaults - all user input
const defaultInputs = {
  peak_demand_kw: '',
  daily_energy_kwh: '',
  num_sites: '',
  backup_duration_hrs: '',
  use_case: '',
  grid_peak_tariff: '',
  grid_offpeak_tariff: '',
  cycles_per_day: '',
  project_lifetime_yrs: '',
  dod_pct: '',
  battery_module_kwh: '',
  cycle_life: '',
  calendar_life_yrs: '',
  round_trip_efficiency_pct: '',
  solar_pv_kwp: '',
  solar_cuf_pct: '',
  monthly_md_charge_saving: '',
  dg_displacement_saving_yr: '',
  dg_capacity_kw: '',
  dg_capex: '',
  dg_fuel_cost_yr: '',
  dg_om_yr: '',
};

const numericDefaults: Record<string, number> = {
  peak_demand_kw: 400,
  daily_energy_kwh: 350,
  num_sites: 1,
  backup_duration_hrs: 2,
  grid_peak_tariff: 12,
  grid_offpeak_tariff: 6,
  cycles_per_day: 2,
  project_lifetime_yrs: 12,
  dod_pct: 85,
  battery_module_kwh: 52.25,
  cycle_life: 6000,
  calendar_life_yrs: 10,
  round_trip_efficiency_pct: 90,
  solar_pv_kwp: 0,
  solar_cuf_pct: 19,
  monthly_md_charge_saving: 0,
  dg_displacement_saving_yr: 0,
  dg_capacity_kw: 0,
  dg_capex: 0,
  dg_fuel_cost_yr: 0,
  dg_om_yr: 0,
};

const API_BASE = (import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL || "http://localhost:8000";

type ProjectWizardProps = {
  onOptimizationComplete?: (payload: { result: any; inputs: any; calcId: number; projectId: number | null }) => void;
};

export function ProjectWizard({ onOptimizationComplete }: ProjectWizardProps) {
  const { setProject } = useProjectStore();
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<SystemConfig>(null);
  const [inputs, setInputs] = useState(defaultInputs);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    setError(null);
    try {
      // Convert string inputs to numbers for API
      const numericInputs = Object.entries(inputs).reduce((acc, [key, val]) => {
        if (key === 'use_case') {
          acc[key] = (val as string).trim();
          return acc;
        }
        const parsed = val === '' ? Number.NaN : parseFloat(val as string);
        acc[key] = Number.isFinite(parsed) ? parsed : (numericDefaults[key] ?? 0);
        return acc;
      }, {} as any);

      if (!numericInputs.dod_pct || numericInputs.dod_pct <= 0) {
        numericInputs.dod_pct = numericDefaults.dod_pct;
      }

      const res = await fetch(`${API_BASE}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...numericInputs,
          use_case: numericInputs.use_case || 'Sub-MW BESS',
        }),
      });
      
      if (!res.ok) throw new Error(`Calculation failed: ${res.status}`);
      
      const result = await res.json();
      const calcId = result.id || Date.now();

      let projectId: number | null = null;
      try {
        const projectRes = await fetch(`${API_BASE}/api/projects`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...numericInputs,
            name: `Project ${new Date().toISOString()}`,
            use_case: numericInputs.use_case || 'Sub-MW BESS',
          }),
        });

        if (projectRes.ok) {
          const project = await projectRes.json();
          projectId = project.id || null;

          if (projectId) {
            await fetch(`${API_BASE}/api/projects/${projectId}/configurations`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
          }
        }
      } catch {
        // Keep optimization result flow working even if project/config generation fails.
      }

      setProject({
        id: projectId || calcId,
        name: `Project ${projectId || calcId}`,
        created_at: new Date().toISOString(),
        inputs: { ...numericInputs, system_config: config },
      });
      onOptimizationComplete?.({
        result,
        inputs: { ...numericInputs, system_config: config },
        calcId,
        projectId,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateInput = (key: string, value: string) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  // Step 1: System Configuration Only (Sub-Megawatt)
  if (step === 1) {
    return (
      <div className="wizard-container">
        <div className="wizard-card">
          <div className="wizard-header">
            <h2>System Configuration</h2>
            <span className="scale-badge sub-mw">Sub-Megawatt</span>
          </div>
          <p className="wizard-desc">Select your system configuration for industrial and C&I applications</p>
          
          <div className="config-grid">
            <button
              className={`config-btn ${config === 'bess-only' ? 'active' : ''}`}
              onClick={() => setConfig('bess-only')}
            >
              <div className="config-title">BESS Only</div>
              <div className="config-desc">Battery storage system only</div>
            </button>
            <button
              className={`config-btn ${config === 'bess-solar' ? 'active' : ''}`}
              onClick={() => setConfig('bess-solar')}
            >
              <div className="config-title">BESS + Solar</div>
              <div className="config-desc">Battery with solar PV integration</div>
            </button>
            <button
              className={`config-btn ${config === 'bess-solar-dg' ? 'active' : ''}`}
              onClick={() => setConfig('bess-solar-dg')}
            >
              <div className="config-title">BESS + Solar + DG</div>
              <div className="config-desc">Battery, solar, and diesel generator</div>
            </button>
            <button
              className={`config-btn ${config === 'solar-bess-dg' ? 'active' : ''}`}
              onClick={() => setConfig('solar-bess-dg')}
            >
              <div className="config-title">Solar + BESS + DG</div>
              <div className="config-desc">Solar primary with battery and DG backup</div>
            </button>
          </div>
          
          <div className="btn-row">
            <button
              className="btn-primary"
              disabled={!config}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Energy Inputs Form (previously Step 3)
  const showSolar = config?.includes('solar');
  const showDG = config?.includes('dg');

  return (
    <div className="wizard-container">
      <div className="wizard-card full">
        <div className="wizard-header">
          <h2>Energy Inputs</h2>
          <span className="config-badge">{getConfigLabel(config)}</span>
        </div>

        <div className="form-section">
          <h3 className="section-title">Load Profile</h3>
          <div className="form-grid">
            <InputRow
              label="Peak Demand (kW)"
              value={inputs.peak_demand_kw}
              onChange={(v) => updateInput('peak_demand_kw', v)}
              hint="Typically < 1000 kW for Sub-MW"
            />
            <InputRow label="Daily Energy (kWh)" value={inputs.daily_energy_kwh} onChange={(v) => updateInput('daily_energy_kwh', v)} />
            <InputRow label="Backup Duration (hrs)" value={inputs.backup_duration_hrs} onChange={(v) => updateInput('backup_duration_hrs', v)} />
            <InputRow label="Cycles/Day" value={inputs.cycles_per_day} onChange={(v) => updateInput('cycles_per_day', v)} />
            <InputRow label="Number of Sites" value={inputs.num_sites} onChange={(v) => updateInput('num_sites', v)} />
            <InputRow label="Project Lifetime (yrs)" value={inputs.project_lifetime_yrs} onChange={(v) => updateInput('project_lifetime_yrs', v)} />
          </div>
        </div>

        <div className="form-section">
          <h3 className="section-title">Battery Specifications</h3>
          <div className="form-grid">
            <InputRow label="Module Capacity (kWh)" value={inputs.battery_module_kwh} onChange={(v) => updateInput('battery_module_kwh', v)} />
            <InputRow label="Depth of Discharge (%)" value={inputs.dod_pct} onChange={(v) => updateInput('dod_pct', v)} />
            <InputRow label="Cycle Life" value={inputs.cycle_life} onChange={(v) => updateInput('cycle_life', v)} />
            <InputRow label="Round Trip Efficiency (%)" value={inputs.round_trip_efficiency_pct} onChange={(v) => updateInput('round_trip_efficiency_pct', v)} />
            <InputRow label="Calendar Life (yrs)" value={inputs.calendar_life_yrs} onChange={(v) => updateInput('calendar_life_yrs', v)} />
          </div>
        </div>

        {showSolar && (
          <div className="form-section">
            <h3 className="section-title solar">Solar PV</h3>
            <div className="form-grid">
              <InputRow label="Solar PV Capacity (kWp)" value={inputs.solar_pv_kwp} onChange={(v) => updateInput('solar_pv_kwp', v)} />
              <InputRow label="Solar CUF (%)" value={inputs.solar_cuf_pct} onChange={(v) => updateInput('solar_cuf_pct', v)} />
            </div>
          </div>
        )}

        {showDG && (
          <div className="form-section">
            <h3 className="section-title dg">Diesel Generator</h3>
            <div className="form-grid">
              <InputRow label="DG Capacity (kW)" value={inputs.dg_capacity_kw} onChange={(v) => updateInput('dg_capacity_kw', v)} />
              <InputRow label="DG CAPEX (Rs)" value={inputs.dg_capex} onChange={(v) => updateInput('dg_capex', v)} />
              <InputRow label="Annual Fuel Cost (Rs)" value={inputs.dg_fuel_cost_yr} onChange={(v) => updateInput('dg_fuel_cost_yr', v)} />
              <InputRow label="Annual O&M (Rs)" value={inputs.dg_om_yr} onChange={(v) => updateInput('dg_om_yr', v)} />
            </div>
          </div>
        )}

        <div className="form-section">
          <h3 className="section-title tariffs">Tariffs & Savings</h3>
          <div className="form-grid">
            <InputRow label="Grid Peak Tariff (Rs/kWh)" value={inputs.grid_peak_tariff} onChange={(v) => updateInput('grid_peak_tariff', v)} />
            <InputRow label="Grid Off-peak (Rs/kWh)" value={inputs.grid_offpeak_tariff} onChange={(v) => updateInput('grid_offpeak_tariff', v)} />
            <InputRow label="MD Charge Saving/Month (Rs)" value={inputs.monthly_md_charge_saving} onChange={(v) => updateInput('monthly_md_charge_saving', v)} />
            <InputRow label="DG Displacement Saving/Year (Rs)" value={inputs.dg_displacement_saving_yr} onChange={(v) => updateInput('dg_displacement_saving_yr', v)} />
          </div>
        </div>

        {error && <div className="error-bar">{error}</div>}

        <div className="btn-row">
          <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
          <button className="btn-primary" onClick={handleCalculate} disabled={loading}>
            {loading ? 'Calculating...' : 'Run Optimization'}
          </button>
        </div>
      </div>
    </div>
  );
}

function InputRow({
  label,
  value,
  onChange,
  hint = '',
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div className="input-group">
      <label className="input-label">
        {label}
        {hint && <span className="input-hint">{hint}</span>}
      </label>
      <input 
        type="number" 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        className="input-field"
        placeholder="Enter value"
      />
    </div>
  );
}

function getConfigLabel(config: SystemConfig): string {
  switch (config) {
    case 'bess-only': return 'BESS Only';
    case 'bess-solar': return 'BESS + Solar';
    case 'bess-solar-dg': return 'BESS + Solar + DG';
    case 'solar-bess-dg': return 'Solar + BESS + DG';
    default: return '';
  }
}
