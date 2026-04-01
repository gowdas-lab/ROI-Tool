import { useState, useEffect, useCallback } from "react";
import "./BESSApp.css";
import { ProjectWizard } from "./pages";

const API_BASE = "http://localhost:8000";

const fmt = (n, decimals = 0) =>
  n == null ? "—" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCur = (n) => n == null ? "—" : `₹${fmt(n)}`;
const fmtLakh = (n) => n == null ? "—" : `₹${fmt(n / 100000, 2)}L`;

const TABS = ["Project Wizard", "Configurations", "Supplier Engine", "BOM Viewer", "Analytics", "History"];

const defaultInputs = {
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

function InputField({ label, name, value, onChange, unit, hint, type = "number" }) {
  return (
    <div className="input-row">
      <label className="input-label">{label}</label>
      <div className="input-control">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="inp"
          step="any"
        />
        {unit && <span className="input-unit">{unit}</span>}
      </div>
      {hint && <span className="input-hint">{hint}</span>}
    </div>
  );
}

function SectionHeader({ label }) {
  return <div className="section-header"><span>{label}</span></div>;
}

function KPICard({ label, value, sub, accent }) {
  return (
    <div className={`kpi-card ${accent ? "kpi-accent-" + accent : ""}`}>
      <div className="kpi-value">{value}</div>
      <div className="kpi-label">{label}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="mini-bar-row">
      <span className="mini-bar-label">{label}</span>
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color || "var(--accent)" }} />
      </div>
      <span className="mini-bar-val">{fmtCur(value)}</span>
    </div>
  );
}

// ── Tab: Inputs ──────────────────────────────────────────────────────────────
function InputsTab({ inputs, onChange, onCalculate, loading }) {
  const handle = (e) => {
    const { name, value, type } = e.target;
    onChange({ ...inputs, [name]: type === "number" ? parseFloat(value) || 0 : value });
  };

  return (
    <div className="tab-content inputs-tab">
      <div className="inputs-grid">
        <div className="inputs-col">
          <SectionHeader label="A. Load Profile" />
          <InputField label="Peak Demand" name="peak_demand_kw" value={inputs.peak_demand_kw} onChange={handle} unit="kW" />
          <InputField label="Daily Energy" name="daily_energy_kwh" value={inputs.daily_energy_kwh} onChange={handle} unit="kWh/day" />
          <InputField label="Number of Sites" name="num_sites" value={inputs.num_sites} onChange={handle} />
          <InputField label="Backup Duration" name="backup_duration_hrs" value={inputs.backup_duration_hrs} onChange={handle} unit="hrs" />
          <div className="input-row">
            <label className="input-label">Use Case</label>
            <div className="input-control">
              <select name="use_case" value={inputs.use_case} onChange={handle} className="inp">
                <option>EV fast charging</option>
                <option>C&I Load Management</option>
                <option>Grid Load Management</option>
                <option>Energy Bill Optimisation</option>
                <option>Peak Shaving</option>
                <option>Backup Power</option>
              </select>
            </div>
          </div>
          <InputField label="Grid Peak Tariff" name="grid_peak_tariff" value={inputs.grid_peak_tariff} onChange={handle} unit="₹/kWh" />
          <InputField label="Grid Off-Peak Tariff" name="grid_offpeak_tariff" value={inputs.grid_offpeak_tariff} onChange={handle} unit="₹/kWh" />
          <InputField label="Cycles / Day" name="cycles_per_day" value={inputs.cycles_per_day} onChange={handle} />
          <InputField label="Project Lifetime" name="project_lifetime_yrs" value={inputs.project_lifetime_yrs} onChange={handle} unit="yrs" />

          <SectionHeader label="B. Battery Parameters" />
          <InputField label="DoD" name="dod_pct" value={inputs.dod_pct} onChange={handle} unit="%" hint="Rec. 85–90% for LFP" />
          <InputField label="Module Capacity" name="battery_module_kwh" value={inputs.battery_module_kwh} onChange={handle} unit="kWh" />
          <InputField label="Cycle Life" name="cycle_life" value={inputs.cycle_life} onChange={handle} unit="cycles" hint="LFP: 4,000–6,000" />
          <InputField label="Calendar Life" name="calendar_life_yrs" value={inputs.calendar_life_yrs} onChange={handle} unit="yrs" />
          <InputField label="Round Trip Efficiency" name="round_trip_efficiency_pct" value={inputs.round_trip_efficiency_pct} onChange={handle} unit="%" />
        </div>

        <div className="inputs-col">
          <SectionHeader label="C. Solar PV Inputs" />
          <InputField label="Solar PV Capacity" name="solar_pv_kwp" value={inputs.solar_pv_kwp} onChange={handle} unit="kWp" hint="Enter 0 if no solar" />
          <InputField label="Solar CUF" name="solar_cuf_pct" value={inputs.solar_cuf_pct} onChange={handle} unit="%" />
          <InputField label="Solar CAPEX" name="solar_capex_per_kwp" value={inputs.solar_capex_per_kwp} onChange={handle} unit="₹/kWp" />
          <InputField label="Solar O&M" name="solar_om_per_kwp_yr" value={inputs.solar_om_per_kwp_yr} onChange={handle} unit="₹/kWp/yr" />
          <InputField label="Panel Degradation" name="solar_degradation_pct_yr" value={inputs.solar_degradation_pct_yr} onChange={handle} unit="%/yr" />

          <SectionHeader label="D. Savings Inputs" />
          <InputField label="Monthly MD Charge Saving" name="monthly_md_charge_saving" value={inputs.monthly_md_charge_saving} onChange={handle} unit="₹/mo" />
          <InputField label="DG Displacement Saving" name="dg_displacement_saving_yr" value={inputs.dg_displacement_saving_yr} onChange={handle} unit="₹/yr" />

          <SectionHeader label="E. Cost Factors" />
          <InputField label="Installation %" name="installation_pct" value={inputs.installation_pct} onChange={handle} unit="%" />
          <InputField label="Commissioning %" name="commissioning_pct" value={inputs.commissioning_pct} onChange={handle} unit="%" />
          <InputField label="Contingency %" name="contingency_pct" value={inputs.contingency_pct} onChange={handle} unit="%" />

          <SectionHeader label="F. Degradation & DG" />
          <InputField label="Annual Battery Degradation" name="annual_degradation_pct" value={inputs.annual_degradation_pct} onChange={handle} unit="%/yr" />
          <InputField label="Tariff Escalation" name="tariff_escalation_pct" value={inputs.tariff_escalation_pct} onChange={handle} unit="%/yr" />
          <InputField label="DG Fuel Escalation" name="dg_fuel_escalation_pct" value={inputs.dg_fuel_escalation_pct} onChange={handle} unit="%/yr" />
          <InputField label="DG Capacity" name="dg_capacity_kw" value={inputs.dg_capacity_kw} onChange={handle} unit="kW" />
          <InputField label="DG CAPEX" name="dg_capex" value={inputs.dg_capex} onChange={handle} unit="₹" />
          <InputField label="DG Fuel Cost/yr" name="dg_fuel_cost_yr" value={inputs.dg_fuel_cost_yr} onChange={handle} unit="₹/yr" />
        </div>
      </div>

      <div className="calc-btn-row">
        <button className="calc-btn" onClick={onCalculate} disabled={loading}>
          {loading ? <span className="spinner" /> : null}
          {loading ? "Calculating…" : "⚡ Run Optimisation"}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Sizing ──────────────────────────────────────────────────────────────
function SizingTab({ data }) {
  if (!data) return <EmptyState />;
  const { sizing, capex } = data;
  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Required Energy" value={`${fmt(sizing.required_energy_kwh)} kWh`} sub="Peak kW × Backup hrs" accent="blue" />
        <KPICard label="Installed Capacity" value={`${fmt(sizing.actual_installed_kwh)} kWh`} sub="After module rounding" accent="green" />
        <KPICard label="Battery Modules" value={sizing.num_modules} sub={`× ${data.inputs?.battery_module_kwh || 52.25} kWh each`} accent="amber" />
        <KPICard label="Inverters (50kW)" value={sizing.num_inverters} sub="Parallel string" accent="teal" />
        <KPICard label="Total CAPEX" value={fmtLakh(capex.total_capex)} sub={fmtCur(capex.total_capex)} accent="red" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">CAPEX Breakdown</div>
          <MiniBar label="BOM Equipment" value={capex.bom_equipment_total} max={capex.total_capex} color="var(--accent)" />
          <MiniBar label="Installation (8%)" value={capex.installation_cost} max={capex.total_capex} color="var(--teal)" />
          <MiniBar label="Commissioning (3%)" value={capex.commissioning_cost} max={capex.total_capex} color="var(--amber)" />
          <MiniBar label="Contingency (5%)" value={capex.contingency_cost} max={capex.total_capex} color="var(--red)" />
          <div className="total-row">
            <span>TOTAL CAPEX</span><span className="total-val">{fmtCur(capex.total_capex)}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title">System Configuration</div>
          <table className="data-table">
            <tbody>
              <tr><td>Required BESS Energy</td><td>{fmt(sizing.required_energy_kwh)} kWh</td></tr>
              <tr><td>Capacity Required (÷DoD)</td><td>{fmt(sizing.installed_cap_required_kwh)} kWh</td></tr>
              <tr><td>Modules Required</td><td>{sizing.num_modules} pcs</td></tr>
              <tr><td>Actual Installed</td><td>{fmt(sizing.actual_installed_kwh)} kWh</td></tr>
              <tr><td>Inverters (50kW each)</td><td>{sizing.num_inverters} units</td></tr>
              <tr><td>BOM Equipment Cost</td><td>{fmtCur(capex.bom_equipment_total)}</td></tr>
              <tr><td>Installation Labour</td><td>{fmtCur(capex.installation_cost)}</td></tr>
              <tr><td>Commissioning</td><td>{fmtCur(capex.commissioning_cost)}</td></tr>
              <tr><td>Contingency</td><td>{fmtCur(capex.contingency_cost)}</td></tr>
              <tr className="row-total"><td>TOTAL CAPEX</td><td>{fmtCur(capex.total_capex)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Cost Analysis ───────────────────────────────────────────────────────
function CostTab({ data }) {
  if (!data) return <EmptyState />;
  const { capex, opex, lcos } = data;
  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Total CAPEX" value={fmtLakh(capex.total_capex)} accent="red" />
        <KPICard label="Annual OPEX" value={fmtCur(opex.total_annual_opex)} sub="O&M + Insurance + Monitoring" accent="amber" />
        <KPICard label="Lifetime OPEX" value={fmtCur(opex.lifetime_opex)} accent="blue" />
        <KPICard label="LCOS" value={`₹${fmt(lcos.lcos_inr_per_kwh, 2)}/kWh`} sub="Levelised Cost of Storage" accent="green" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">OPEX Breakdown</div>
          <table className="data-table">
            <tbody>
              <tr><td>Annual O&M (1.5% CAPEX)</td><td>{fmtCur(opex.annual_om)}</td></tr>
              <tr><td>Insurance (0.5% CAPEX)</td><td>{fmtCur(opex.insurance)}</td></tr>
              <tr><td>Remote Monitoring</td><td>{fmtCur(opex.monitoring)}</td></tr>
              <tr className="row-total"><td>TOTAL ANNUAL OPEX</td><td>{fmtCur(opex.total_annual_opex)}</td></tr>
              <tr><td>Lifetime OPEX</td><td>{fmtCur(opex.lifetime_opex)}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="card">
          <div className="card-title">LCOS Calculation</div>
          <table className="data-table">
            <tbody>
              <tr><td>Annual Cycles</td><td>{fmt(lcos.annual_cycles)}</td></tr>
              <tr><td>Total Cycles (project life)</td><td>{fmt(lcos.total_cycles)}</td></tr>
              <tr><td>Energy Throughput</td><td>{fmt(lcos.energy_throughput_kwh)} kWh</td></tr>
              <tr><td>Total Cost (CAPEX+OPEX)</td><td>{fmtCur(capex.total_capex + opex.lifetime_opex)}</td></tr>
              <tr className="row-total"><td>LCOS</td><td>₹{fmt(lcos.lcos_inr_per_kwh, 4)}/kWh</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: ROI & Savings ───────────────────────────────────────────────────────
function ROITab({ data }) {
  if (!data) return <EmptyState />;
  const { savings, roi, cashflow_years } = data;

  const breakeven = cashflow_years?.find(y => y.cumulative_net >= 0);

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Total Annual Savings" value={fmtLakh(savings.total_annual_savings)} sub={fmtCur(savings.total_annual_savings)} accent="green" />
        <KPICard label="Simple Payback" value={`${roi.simple_payback_yrs} yrs`} sub={roi.simple_payback_yrs < 4 ? "🟢 Excellent" : roi.simple_payback_yrs < 6 ? "🟡 Good" : "🔴 Review"} accent={roi.simple_payback_yrs < 4 ? "green" : roi.simple_payback_yrs < 6 ? "amber" : "red"} />
        <KPICard label="10-Yr ROI" value={`${fmt(roi.roi_10yr_pct, 1)}%`} accent="blue" />
        <KPICard label="Breakeven Year" value={breakeven ? `Year ${breakeven.year}` : "Post-10yr"} sub="Cumulative positive" accent="teal" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Annual Savings Breakdown</div>
          <MiniBar label="Arbitrage Saving" value={savings.annual_arbitrage} max={savings.total_annual_savings} color="var(--green)" />
          <MiniBar label="MD Charge Reduction" value={savings.annual_md_saving} max={savings.total_annual_savings} color="var(--accent)" />
          <MiniBar label="DG Displacement" value={savings.dg_displacement} max={savings.total_annual_savings} color="var(--teal)" />
          <div className="total-row">
            <span>TOTAL ANNUAL SAVINGS</span><span className="total-val">{fmtCur(savings.total_annual_savings)}</span>
          </div>
        </div>
        <div className="card">
          <div className="card-title">ROI Summary</div>
          <table className="data-table">
            <tbody>
              <tr><td>Daily Dischargeable Energy</td><td>{fmt(savings.daily_dischargeable_kwh)} kWh</td></tr>
              <tr><td>Arbitrage ₹/kWh</td><td>₹{savings.arbitrage_per_kwh}</td></tr>
              <tr><td>Annual Arbitrage</td><td>{fmtCur(savings.annual_arbitrage)}</td></tr>
              <tr><td>Annual MD Saving</td><td>{fmtCur(savings.annual_md_saving)}</td></tr>
              <tr><td>DG Displacement</td><td>{fmtCur(savings.dg_displacement)}</td></tr>
              <tr className="row-total"><td>Total Annual Savings</td><td>{fmtCur(savings.total_annual_savings)}</td></tr>
              <tr><td>Net Annual Benefit</td><td>{fmtCur(roi.net_annual_benefit)}</td></tr>
              <tr><td>Simple Payback</td><td>{roi.simple_payback_yrs} years</td></tr>
              <tr><td>10-Yr Cumulative Net</td><td>{fmtCur(roi.cumulative_10yr_net)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Year-by-Year Cash Flow</div>
        <div className="table-scroll">
          <table className="data-table cashflow-table">
            <thead>
              <tr>
                <th>Year</th><th>SOH %</th><th>Usable kWh</th>
                <th>Arbitrage</th><th>MD+DG Saving</th><th>Total Saving</th>
                <th>Net Benefit</th><th>Cumulative Net</th>
              </tr>
            </thead>
            <tbody>
              {cashflow_years?.map(r => (
                <tr key={r.year} className={r.cumulative_net >= 0 ? "row-positive" : ""}>
                  <td>Yr {r.year}</td>
                  <td>{r.soh_pct}%</td>
                  <td>{fmt(r.usable_capacity_kwh)}</td>
                  <td>{fmtCur(r.arbitrage_saving)}</td>
                  <td>{fmtCur(r.md_dg_saving)}</td>
                  <td>{fmtCur(r.total_saving)}</td>
                  <td>{fmtCur(r.net_benefit)}</td>
                  <td className={r.cumulative_net >= 0 ? "pos" : "neg"}>{fmtCur(r.cumulative_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Degradation ─────────────────────────────────────────────────────────
function DegradationTab({ data }) {
  if (!data) return <EmptyState />;
  const { cashflow_years, capex, savings } = data;
  const maxBar = Math.max(...(cashflow_years?.map(r => r.total_saving) || [1]));

  return (
    <div className="tab-content">
      <div className="card">
        <div className="card-title">Degradation-Adjusted Cash Flow — Year-by-Year</div>
        <div className="deg-chart">
          {cashflow_years?.map(r => {
            const pct = (r.total_saving / maxBar) * 100;
            const isPositive = r.cumulative_net >= 0;
            return (
              <div key={r.year} className="deg-bar-group">
                <div className="deg-bar-val">{fmtLakh(r.total_saving)}</div>
                <div className="deg-bar-wrap">
                  <div
                    className={`deg-bar ${isPositive ? "deg-bar-pos" : "deg-bar-neg"}`}
                    style={{ height: `${Math.max(8, pct)}%` }}
                    title={`Yr ${r.year}: ${fmtCur(r.total_saving)}`}
                  />
                </div>
                <div className="deg-bar-label">Y{r.year}</div>
                <div className="deg-soh">{r.soh_pct}%</div>
              </div>
            );
          })}
        </div>
        <div className="deg-legend">
          <span className="legend-green">■</span> Breakeven years &nbsp;
          <span className="legend-amber">■</span> Pre-breakeven &nbsp;
          <span className="deg-note">Bar height = total saving; label = SOH %</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Detailed Year-by-Year Analysis</div>
        <div className="table-scroll">
          <table className="data-table cashflow-table">
            <thead>
              <tr>
                <th>Year</th><th>SOH</th><th>Usable kWh</th>
                <th>Flat Arbitrage</th><th>Degraded Arbitrage</th>
                <th>Total Saving</th><th>Net Benefit</th><th>Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {cashflow_years?.map(r => (
                <tr key={r.year} className={r.cumulative_net >= 0 ? "row-positive" : ""}>
                  <td>Yr {r.year}</td>
                  <td><span className={`soh-badge ${r.soh_pct >= 85 ? "soh-ok" : "soh-warn"}`}>{r.soh_pct}%</span></td>
                  <td>{fmt(r.usable_capacity_kwh)}</td>
                  <td>{fmtCur(savings.annual_arbitrage)}</td>
                  <td>{fmtCur(r.arbitrage_saving)}</td>
                  <td>{fmtCur(r.total_saving)}</td>
                  <td>{fmtCur(r.net_benefit)}</td>
                  <td className={r.cumulative_net >= 0 ? "pos" : "neg"}>{fmtCur(r.cumulative_net)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Sensitivity ─────────────────────────────────────────────────────────
function SensitivityTab({ data }) {
  if (!data) return <EmptyState />;
  const { sensitivity, lcos_matrix } = data;
  const bomMults = ["0.8", "0.9", "1", "1.1", "1.2", "1.3"];

  const pbColor = (v) => {
    if (v < 4) return "cell-green";
    if (v < 6) return "cell-amber";
    return "cell-red";
  };

  const dods = ["70", "80", "85", "90", "95"];

  return (
    <div className="tab-content">
      <div className="card">
        <div className="card-title">Payback Period (yrs) — BOM Cost Multiplier × Peak Grid Tariff</div>
        <div className="table-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Tariff →<br />BOM ↓</th>
                {bomMults.map(m => <th key={m}>×{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {sensitivity?.map(row => (
                <tr key={row.tariff}>
                  <td className="matrix-header">₹{row.tariff}/kWh</td>
                  {bomMults.map(m => (
                    <td key={m} className={`matrix-cell ${pbColor(row.paybacks[m])}`}>
                      {row.paybacks[m]} yrs
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sensitivity-legend">
          <span className="cell-green legend-item">■ &lt;4 yrs Excellent</span>
          <span className="cell-amber legend-item">■ 4–6 yrs Good</span>
          <span className="cell-red legend-item">■ &gt;6 yrs Review</span>
          <span className="base-marker">★ Base: ×1.0, ₹12/kWh</span>
        </div>
      </div>

      <div className="card">
        <div className="card-title">LCOS (₹/kWh) — Cycle Life × Depth of Discharge</div>
        <div className="table-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Cycles →<br />DoD ↓</th>
                {dods.map(d => <th key={d}>{d}%</th>)}
              </tr>
            </thead>
            <tbody>
              {lcos_matrix?.map(row => (
                <tr key={row.cycle_life}>
                  <td className="matrix-header">{fmt(row.cycle_life)} cyc</td>
                  {dods.map(d => {
                    const v = row.values[d];
                    const cls = v < 6 ? "cell-green" : v < 10 ? "cell-amber" : "cell-red";
                    return <td key={d} className={`matrix-cell ${cls}`}>₹{v}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sensitivity-legend">
          <span className="cell-green legend-item">■ &lt;₹6/kWh Optimal</span>
          <span className="cell-amber legend-item">■ ₹6–10 Acceptable</span>
          <span className="cell-red legend-item">■ &gt;₹10 Review</span>
          <span className="base-marker">★ Base: 90% DoD, 4,000 cycles</span>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Configurations (Permutation Results) ────────────────────────────────
function ConfigurationsTab({ projectId }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetch(`${API_BASE}/api/projects/${projectId}/configurations`)
      .then(r => r.json())
      .then(d => { setConfigs(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="loading-msg">Loading configurations…</div>;
  if (!projectId) return <EmptyState message="Create a project first to see configurations" />;
  if (configs.length === 0) return <div className="empty-msg">No configurations yet. Generate them from Project Wizard.</div>;

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Total Configs" value={configs.length} accent="blue" />
        <KPICard label="Recommended" value={configs.find(c => c.is_recommended)?.total_kwh + " kWh"} sub="Best match" accent="green" />
        <KPICard label="Top Score" value={configs[0]?.overall_score} sub="Efficiency + Cost" accent="amber" />
      </div>

      <div className="card">
        <div className="card-title">Ranked Configurations — kW × kWh × Module Combos</div>
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th><th>Modules</th><th>Total kWh</th><th>Inverters</th><th>Total kW</th>
                <th>Efficiency Score</th><th>Cost Score</th><th>Overall</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(c => (
                <tr key={c.id} className={c.is_recommended ? "row-positive" : ""}>
                  <td>{c.rank}</td>
                  <td>{c.num_modules} × {c.module_kwh}kWh</td>
                  <td>{fmt(c.total_kwh)} kWh</td>
                  <td>{c.num_inverters} × {c.inverter_kw}kW</td>
                  <td>{fmt(c.total_kw)} kW</td>
                  <td>{c.efficiency_score}%</td>
                  <td>{c.cost_score}%</td>
                  <td className={c.rank === 1 ? "pos" : ""}>{c.overall_score}%</td>
                  <td>{c.is_recommended ? <span className="best-tag">RECOMMENDED</span> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Supplier Engine (Selection + Scoring) ───────────────────────────────
function SupplierEngineTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [weights, setWeights] = useState({ price: 30, technical: 25, delivery: 15, warranty: 10, support: 10, cert: 10 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/suppliers`)
      .then(r => r.json())
      .then(d => setSuppliers(d));
    fetch(`${API_BASE}/api/scoring-weights`)
      .then(r => r.json())
      .then(d => setWeights(d.weights));
  }, []);

  const handleScoreSubmit = async (supplierId, scores) => {
    await fetch(`${API_BASE}/api/suppliers/${supplierId}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...scores, weights })
    });
    // Refresh suppliers
    const r = await fetch(`${API_BASE}/api/suppliers`);
    setSuppliers(await r.json());
  };

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Total Suppliers" value={suppliers.length} accent="blue" />
        <KPICard label="Weight: Price" value={`${weights.price}%`} accent="green" />
        <KPICard label="Weight: Technical" value={`${weights.technical}%`} accent="amber" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Scoring Weights (Configurable)</div>
          {Object.entries(weights).map(([key, val]) => (
            <div key={key} className="input-row">
              <label className="input-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                type="number"
                value={val}
                onChange={e => setWeights({ ...weights, [key]: parseInt(e.target.value) })}
                className="inp"
                min="0"
                max="100"
              />
              <span className="input-unit">%</span>
            </div>
          ))}
          <button className="calc-btn" onClick={() => handleScoreSubmit(0, {})} style={{marginTop: "1rem"}}>
            Save Weights
          </button>
        </div>

        <div className="card">
          <div className="card-title">Supplier Rankings</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th><th>Category</th><th>Price</th><th>Tech</th><th>Delivery</th><th>Weighted</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map(s => (
                  <tr key={s.id}>
                    <td>{s.name}</td>
                    <td><span className="cat-badge">{s.component_category}</span></td>
                    <td>{s.price_score || "-"}</td>
                    <td>{s.technical_score || "-"}</td>
                    <td>{s.delivery_score || "-"}</td>
                    <td className={s.weighted_score > 70 ? "pos" : ""}>{s.weighted_score || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Analytics (ROI, LCOS, Payback) ───────────────────────────────────────
function AnalyticsTab({ data }) {
  if (!data) return <EmptyState />;
  
  const { sizing, capex, opex, lcos, savings, roi, cashflow_years, sensitivity } = data;
  const breakeven = cashflow_years?.find(y => y.cumulative_net >= 0);

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Total CAPEX" value={fmtLakh(capex.total_capex)} accent="red" />
        <KPICard label="LCOS" value={`₹${fmt(lcos.lcos_inr_per_kwh, 2)}/kWh`} sub="Levelised Cost" accent="green" />
        <KPICard label="Payback" value={`${roi.simple_payback_yrs} yrs`} sub={roi.simple_payback_yrs < 4 ? "🟢 Excellent" : roi.simple_payback_yrs < 6 ? "🟡 Good" : "🔴 Review"} accent={roi.simple_payback_yrs < 4 ? "green" : roi.simple_payback_yrs < 6 ? "amber" : "red"} />
        <KPICard label="10-Yr ROI" value={`${fmt(roi.roi_10yr_pct, 1)}%`} accent="blue" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Savings Breakdown</div>
          <MiniBar label="Annual Arbitrage" value={savings.annual_arbitrage} max={savings.total_annual_savings} color="var(--green)" />
          <MiniBar label="MD Charge Saving" value={savings.annual_md_saving} max={savings.total_annual_savings} color="var(--accent)" />
          <MiniBar label="DG Displacement" value={savings.dg_displacement} max={savings.total_annual_savings} color="var(--teal)" />
          <div className="total-row">
            <span>Total Annual Savings</span><span className="total-val">{fmtCur(savings.total_annual_savings)}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Cash Flow Summary</div>
          <table className="data-table">
            <tbody>
              <tr><td>Net Annual Benefit</td><td>{fmtCur(roi.net_annual_benefit)}</td></tr>
              <tr><td>Breakeven Year</td><td>{breakeven ? `Year ${breakeven.year}` : "Post-10yr"}</td></tr>
              <tr><td>10-Yr Cumulative Net</td><td>{fmtCur(roi.cumulative_10yr_net)}</td></tr>
              <tr className="row-total"><td>Lifetime Energy Throughput</td><td>{fmt(lcos.energy_throughput_kwh)} kWh</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: BOM ─────────────────────────────────────────────────────────────────
function BOMTab({ data }) {
  if (!data) return <EmptyState />;
  const { bom_items, bom_summary } = data;

  const cats = [...new Set(bom_items?.map(i => i.category) || [])];
  const [filter, setFilter] = useState("All");

  const filtered = filter === "All" ? bom_items : bom_items?.filter(i => i.category === filter);

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KPICard label="Total BOM Cost" value={fmtCur(bom_summary?.total_bom)} accent="red" />
        <KPICard label="Line Items" value={bom_summary?.num_line_items} accent="blue" />
        <KPICard label="Battery Share" value={`${fmt((bom_items?.[0]?.line_total / bom_summary?.total_bom) * 100, 1)}%`} sub="of total BOM" accent="amber" />
      </div>

      <div className="bom-filter-row">
        {["All", ...cats].map(c => (
          <button key={c} className={`filter-btn ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      <div className="card">
        <div className="table-scroll">
          <table className="data-table bom-table">
            <thead>
              <tr>
                <th>#</th><th>Category</th><th>Description</th>
                <th>Qty</th><th>Unit</th><th>Specification</th>
                <th>Unit Price</th><th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered?.map(item => (
                <tr key={item.id}>
                  <td>{item.id}</td>
                  <td><span className="cat-badge">{item.category}</span></td>
                  <td>{item.description}</td>
                  <td>{item.qty}</td>
                  <td>{item.unit}</td>
                  <td className="spec-cell">{item.spec}</td>
                  <td>{fmtCur(item.unit_price)}</td>
                  <td className="total-cell">{fmtCur(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td colSpan={7}>TOTAL BOM EQUIPMENT COST</td>
                <td>{fmtCur(bom_summary?.total_bom)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: Comparison ──────────────────────────────────────────────────────────
function ComparisonTab({ data }) {
  if (!data) return <EmptyState />;
  const { comparison } = data;
  if (!comparison) return <EmptyState />;

  const configs = Object.entries(comparison);
  const metrics = [
    { key: "lcos", label: "Simple LCOS (₹/kWh)", fmt: v => `₹${fmt(v, 2)}` },
    { key: "npv_lcos", label: "NPV-Adjusted LCOS (₹/kWh)", fmt: v => `₹${fmt(v, 2)}` },
    { key: "lifetime_cost", label: "Total Lifetime Cost", fmt: v => fmtCur(v) },
    { key: "energy_throughput_kwh", label: "Energy Throughput (kWh)", fmt: v => fmt(v) },
    { key: "lcos_saving_vs_grid", label: "LCOS Savings vs Grid Peak", fmt: v => `₹${fmt(v, 2)}/kWh` },
  ];

  const minLcos = Math.min(...configs.map(([, v]) => v.lcos));

  return (
    <div className="tab-content">
      <div className="kpi-row">
        {configs.map(([name, vals]) => (
          <KPICard
            key={name}
            label={name}
            value={`₹${fmt(vals.lcos, 2)}/kWh`}
            sub={`LCOS`}
            accent={vals.lcos === minLcos ? "green" : "blue"}
          />
        ))}
      </div>

      <div className="card">
        <div className="card-title">LCOS Comparison — All Configurations</div>
        <div className="comparison-bars">
          {configs.map(([name, vals]) => {
            const maxLcos = Math.max(...configs.map(([, v]) => v.lcos));
            const pct = (vals.lcos / maxLcos) * 100;
            return (
              <div key={name} className="cmp-bar-row">
                <div className="cmp-bar-label">{name}</div>
                <div className="cmp-bar-track">
                  <div
                    className={`cmp-bar-fill ${vals.lcos === minLcos ? "cmp-best" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                  <span className="cmp-bar-text">₹{fmt(vals.lcos, 2)}/kWh</span>
                </div>
                {vals.lcos === minLcos && <span className="best-tag">BEST</span>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card">
        <div className="card-title">Full Metrics Comparison</div>
        <div className="table-scroll">
          <table className="data-table comparison-table">
            <thead>
              <tr>
                <th>Metric</th>
                {configs.map(([name]) => <th key={name}>{name}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.key}>
                  <td>{m.label}</td>
                  {configs.map(([name, vals]) => (
                    <td key={name} className={vals[m.key] === Math.min(...configs.map(([, v]) => v[m.key])) && m.key !== "energy_throughput_kwh" ? "cell-green" : ""}>
                      {m.fmt(vals[m.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Tab: History ─────────────────────────────────────────────────────────────
function HistoryTab({ onLoad }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/calculations`)
      .then(r => r.json())
      .then(d => { setRecords(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="tab-content">
      <div className="card">
        <div className="card-title">Calculation History</div>
        {loading ? <div className="loading-msg">Loading…</div> :
          records.length === 0 ? <div className="empty-msg">No calculations yet. Run an optimisation first.</div> :
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Timestamp</th><th>Use Case</th><th>CAPEX</th><th>LCOS</th><th>Payback</th><th></th></tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{new Date(r.timestamp).toLocaleString("en-IN")}</td>
                      <td>{r.use_case}</td>
                      <td>{fmtCur(r.total_capex)}</td>
                      <td>₹{fmt(r.lcos, 2)}/kWh</td>
                      <td>{r.payback_yrs} yrs</td>
                      <td>
                        <button className="load-btn" onClick={() => onLoad(r.id)}>Load</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">⚡</div>
      <div className="empty-text">{message || "Run an optimisation to see results"}</div>
      <div className="empty-sub">Set your inputs in the Project Wizard tab and click "Run Optimisation"</div>
    </div>
  );
}

// ── App Root ─────────────────────────────────────────────────────────────────
export default function BESSApp() {
  const [activeTab, setActiveTab] = useState("Project Wizard");
  const [inputs, setInputs] = useState(defaultInputs);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [calcId, setCalcId] = useState(null);

  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inputs),
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setResult({ ...data, inputs });
      setCalcId(data.id);
      setActiveTab("Sizing");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [inputs]);

  const handleLoadHistory = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/calculations/${id}`);
      const data = await res.json();
      setResult({ ...data.results, inputs: data.inputs });
      setInputs(data.inputs);
      setCalcId(id);
      setActiveTab("Sizing");
    } catch (e) {
      setError(e.message);
    }
  }, []);

  return (
    <div className="bess-app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo-mark">⚡</div>
          <div>
            <div className="app-title">BESS Optimality</div>
            <div className="app-subtitle">Sub-MWh Battery Storage Optimisation Tool · Elektron RE</div>
          </div>
        </div>
        <div className="header-right">
          {calcId && <span className="calc-badge">Calc #{calcId}</span>}
          {result && (
            <div className="header-kpis">
              <div className="h-kpi"><span className="h-kpi-val">{result.sizing?.actual_installed_kwh} kWh</span><span className="h-kpi-label">Installed</span></div>
              <div className="h-kpi"><span className="h-kpi-val">₹{fmt(result.lcos?.lcos_inr_per_kwh, 2)}</span><span className="h-kpi-label">LCOS/kWh</span></div>
              <div className="h-kpi"><span className="h-kpi-val">{result.roi?.simple_payback_yrs} yrs</span><span className="h-kpi-label">Payback</span></div>
            </div>
          )}
        </div>
      </header>

      <nav className="tab-nav">
        {TABS.map(t => (
          <button
            key={t}
            className={`tab-btn ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {error && <div className="error-bar">⚠ {error} — Check API connection (FastAPI at port 8000)</div>}

      <main className="app-main">
        {activeTab === "Project Wizard" && <ProjectWizard />}
        {activeTab === "Configurations" && <ConfigurationsTab projectId={calcId} />}
        {activeTab === "Supplier Engine" && <SupplierEngineTab />}
        {activeTab === "BOM Viewer" && <BOMTab data={result} />}
        {activeTab === "Analytics" && <AnalyticsTab data={result} />}
        {activeTab === "History" && <HistoryTab onLoad={handleLoadHistory} />}
      </main>

      <footer className="app-footer">
        Elektron RE · BESS Optimality v2.0 · FastAPI + PostgreSQL + React · Permutation Engine + Supplier Scoring
      </footer>
    </div>
  );
}
