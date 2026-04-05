import { useState, useEffect, useCallback, useRef } from "react";
import "./BESSApp.css";
import { ProjectWizard } from "./pages";
import { useAuthStore } from "./store/authStore";

const API_BASE = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

const fmt = (n, decimals = 0) =>
  n == null ? "—" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCur = (n) => n == null ? "—" : `₹${fmt(n)}`;
const fmtLakh = (n) => n == null ? "—" : `₹${fmt(n / 100000, 2)}L`;

const BASE_TABS = ["Project Wizard", "Configurations", "Supplier Engine", "BOM Viewer", "Analytics", "History"];

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
function LogoutButton() {
  const { logout, user } = useAuthStore();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ color: '#8b949e', fontSize: '12px' }}>{user?.username}</span>
      <button
        onClick={logout}
        style={{
          padding: '6px 12px',
          background: 'transparent',
          border: '1px solid #30363d',
          borderRadius: '6px',
          color: '#f85149',
          fontSize: '12px',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </div>
  );
}

function SizingTab({ data, inputs }) {
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
function ConfigurationsTab({ projectId, authHeaders, onProjectResolved, onUnauthorized }) {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [resolvedProjectId, setResolvedProjectId] = useState(projectId || null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadConfigs = async () => {
      setLoading(true);
      setError("");
      try {
        let targetProjectId = projectId;
        if (!targetProjectId) {
          const projectRes = await fetch(`${API_BASE}/api/projects?limit=1`, { headers: authHeaders() });
          if (projectRes.status === 401) {
            if (!cancelled) {
              setError("Session expired. Please login again.");
              onUnauthorized?.();
            }
            return;
          }
          if (!projectRes.ok) throw new Error("Could not resolve project");
          const projects = await projectRes.json();
          targetProjectId = projects?.[0]?.id;
          if (targetProjectId) {
            setResolvedProjectId(targetProjectId);
            onProjectResolved?.(targetProjectId);
          }
        }

        if (!targetProjectId) {
          if (!cancelled) setConfigs([]);
          return;
        }

        const res = await fetch(`${API_BASE}/api/projects/${targetProjectId}/configurations`, { headers: authHeaders() });
        if (res.status === 401) {
          if (!cancelled) {
            setError("Session expired. Please login again.");
            onUnauthorized?.();
          }
          return;
        }
        if (!res.ok) throw new Error("Failed to fetch configurations");
        const data = await res.json();
        if (!cancelled) setConfigs(data || []);
      } catch (e) {
        if (!cancelled) {
          setConfigs([]);
          setError(e.message || "Failed to load configurations");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadConfigs();
    return () => {
      cancelled = true;
    };
  }, [projectId, authHeaders, onProjectResolved]);

  if (loading) return <div className="loading-msg">Loading configurations…</div>;
  if (error) return <div className="error-bar">{error}</div>;
  if (!resolvedProjectId && !projectId) return <EmptyState message="Create or load a project first to see configurations" />;
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
function SupplierEngineTab({ authHeaders, onUnauthorized }) {
  const [suppliers, setSuppliers] = useState([]);
  const [weights, setWeights] = useState({ price: 30, technical: 25, delivery: 15, warranty: 10, support: 10, cert: 10 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const [suppliersRes, weightsRes] = await Promise.all([
          fetch(`${API_BASE}/api/suppliers`, { headers: authHeaders() }),
          fetch(`${API_BASE}/api/scoring-weights`, { headers: authHeaders() }),
        ]);

        if (suppliersRes.status === 401 || weightsRes.status === 401) {
          if (!cancelled) {
            setError("Session expired. Please login again.");
            onUnauthorized?.();
          }
          return;
        }

        if (!suppliersRes.ok || !weightsRes.ok) {
          throw new Error("Failed to load supplier engine data");
        }

        const suppliersData = await suppliersRes.json();
        const weightsData = await weightsRes.json();

        if (!cancelled) {
          setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
          setWeights((prev) => ({ ...prev, ...(weightsData?.weights || {}) }));
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load supplier engine");
          setSuppliers([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, onUnauthorized]);

  const handleSaveWeights = async () => {
    await fetch(`${API_BASE}/api/scoring-weights`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ weights })
    });
  };

  if (loading) {
    return <div className="loading-msg">Loading supplier engine...</div>;
  }

  return (
    <div className="tab-content">
      {error && <div className="error-bar">{error}</div>}
      <div className="kpi-row">
        <KPICard label="Total Suppliers" value={suppliers.length} accent="blue" />
        <KPICard label="Weight: Price" value={`${weights?.price ?? 30}%`} accent="green" />
        <KPICard label="Weight: Technical" value={`${weights?.technical ?? 25}%`} accent="amber" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Scoring Weights (Configurable)</div>
          {Object.entries(weights || {}).map(([key, val]) => (
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
          <button className="calc-btn" onClick={handleSaveWeights} style={{marginTop: "1rem"}}>
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

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total CAPEX", capex.total_capex],
      ["LCOS", lcos.lcos_inr_per_kwh],
      ["Payback Years", roi.simple_payback_yrs],
      ["ROI 10Y %", roi.roi_10yr_pct],
      ["Annual Savings", savings.total_annual_savings],
      ["Net Annual Benefit", roi.net_annual_benefit],
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "analytics-report.csv");
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    let y = 16;
    doc.setFontSize(16);
    doc.text("BESS Analytics Report", 14, y);
    y += 10;
    doc.setFontSize(11);
    [
      `Total CAPEX: ${fmtCur(capex.total_capex)}`,
      `LCOS: INR ${fmt(lcos.lcos_inr_per_kwh, 2)}/kWh`,
      `Payback: ${roi.simple_payback_yrs} years`,
      `10Y ROI: ${fmt(roi.roi_10yr_pct, 1)}%`,
      `Annual Savings: ${fmtCur(savings.total_annual_savings)}`,
      `Net Annual Benefit: ${fmtCur(roi.net_annual_benefit)}`,
    ].forEach((line) => {
      doc.text(line, 14, y);
      y += 8;
    });
    doc.save("analytics-report.pdf");
  };

  const downloadDOCX = async () => {
    const { Document, Packer, Paragraph, TextRun } = await import("docx");
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({ children: [new TextRun({ text: "BESS Analytics Report", bold: true, size: 30 })] }),
            new Paragraph(`Total CAPEX: ${fmtCur(capex.total_capex)}`),
            new Paragraph(`LCOS: INR ${fmt(lcos.lcos_inr_per_kwh, 2)}/kWh`),
            new Paragraph(`Payback: ${roi.simple_payback_yrs} years`),
            new Paragraph(`10Y ROI: ${fmt(roi.roi_10yr_pct, 1)}%`),
            new Paragraph(`Annual Savings: ${fmtCur(savings.total_annual_savings)}`),
            new Paragraph(`Net Annual Benefit: ${fmtCur(roi.net_annual_benefit)}`),
          ],
        },
      ],
    });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, "analytics-report.docx");
  };

  return (
    <div className="tab-content">
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title">Export Report</div>
        <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
          <button className="load-btn" onClick={downloadPDF}>Download PDF</button>
          <button className="load-btn" onClick={downloadDOCX}>Download DOCX</button>
          <button className="load-btn" onClick={downloadCSV}>Download CSV</button>
        </div>
      </div>

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
function BOMTab({ isAdmin, authHeaders }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filter, setFilter] = useState("All");
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ category: "", description: "", qty: "", unit: "", spec: "", unit_price: "" });

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/bom`, { headers: authHeaders() });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to load BOM");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || "Failed to load BOM");
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { loadItems(); }, [loadItems]);

  const resetDraft = () => {
    setEditingId(null);
    setDraft({ category: "", description: "", qty: "", unit: "", spec: "", unit_price: "" });
    setShowForm(false);
  };

  const editItem = (item) => {
    setEditingId(item.id);
    setDraft({
      category: item.category || "",
      description: item.description || "",
      qty: String(Number(item.qty_formula) || ""),
      unit: item.unit || "",
      spec: item.spec || "",
      unit_price: String(item.unit_price ?? ""),
    });
    setShowForm(true);
  };

  const saveItem = async () => {
    setError("");
    const isEditing = editingId !== null;
    const endpoint = isEditing ? `${API_BASE}/api/admin/bom/${editingId}` : `${API_BASE}/api/admin/bom`;
    const method = isEditing ? "PUT" : "POST";

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { ...authHeaders(), "X-User-Role": "admin", "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draft.category,
          subcategory: "",
          description: draft.description,
          spec: draft.spec,
          qty_formula: String(Number(draft.qty) || 1),
          unit: draft.unit || "pcs",
          unit_price: Number(draft.unit_price) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save BOM item");
      }
      resetDraft();
      await loadItems();
    } catch (e) {
      setError(e.message || "Failed to save BOM item");
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete this BOM item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/bom/${id}`, {
        method: "DELETE",
        headers: { ...authHeaders(), "X-User-Role": "admin" },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to delete BOM item");
      }
      await loadItems();
    } catch (e) {
      setError(e.message || "Failed to delete BOM item");
    }
  };

  // Map catalog rows to display rows
  const viewerItems = items.map((item) => {
    const qty = Number(item.qty_formula) || 1;
    const unitPrice = Number(item.unit_price) || 0;
    return {
      id: item.id,
      category: item.category,
      description: item.description,
      qty,
      unit: item.unit || "pcs",
      spec: item.spec || "",
      unit_price: unitPrice,
      line_total: qty * unitPrice,
      _raw: item,
    };
  });

  const cats = [...new Set(viewerItems.map(i => i.category).filter(Boolean))];
  const filtered = filter === "All" ? viewerItems : viewerItems.filter(i => i.category === filter);
  const totalBom = filtered.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0);
  const lineItems = filtered.length;
  const batteryShare = totalBom > 0 ? ((filtered?.[0]?.line_total || 0) / totalBom) * 100 : 0;

  return (
    <div className="tab-content">
      {loading && <div style={{ textAlign: "center", padding: "0.5rem", color: "#888" }}>Loading BOM…</div>}
      <div className="kpi-row">
        <KPICard label="Total BOM Cost" value={fmtCur(totalBom)} accent="red" />
        <KPICard label="Line Items" value={lineItems} accent="blue" />
        <KPICard label="Battery Share" value={`${fmt(batteryShare, 1)}%`} sub="of total BOM" accent="amber" />
      </div>

      {isAdmin && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
            <button className="load-btn" onClick={() => setShowForm((v) => !v)}>
              {showForm ? "Close Form" : "Add New BOM Item"}
            </button>
          </div>

          {showForm && (
            <div className="two-col">
              <input className="inp" placeholder="Category (e.g., Battery System)" value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} />
              <input className="inp" placeholder="Description (e.g., Battery Module)" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              <input className="inp" type="number" placeholder="Qty (e.g., 2)" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })} />
              <input className="inp" placeholder="Unit (e.g., pcs)" value={draft.unit} onChange={(e) => setDraft({ ...draft, unit: e.target.value })} />
              <input className="inp" placeholder="Specification (e.g., 51.2V, 100Ah)" value={draft.spec} onChange={(e) => setDraft({ ...draft, spec: e.target.value })} />
              <input className="inp" type="number" placeholder="Unit Price (e.g., 250000)" value={draft.unit_price} onChange={(e) => setDraft({ ...draft, unit_price: e.target.value })} />
              <div className="calc-btn-row" style={{ justifyContent: "flex-start", gridColumn: "1 / -1" }}>
                <button className="calc-btn" onClick={saveItem}>{editingId !== null ? "Update BOM Item" : "Save BOM Item"}</button>
                {editingId !== null && <button className="btn-secondary" onClick={resetDraft}>Cancel Edit</button>}
              </div>
            </div>
          )}
          {error && <div className="error-bar">{error}</div>}
        </div>
      )}
      {!isAdmin && error && <div className="error-bar">{error}</div>}

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
                {isAdmin ? <th>Actions</th> : null}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  <td><span className="cat-badge">{item.category}</span></td>
                  <td>{item.description}</td>
                  <td>{item.qty}</td>
                  <td>{item.unit}</td>
                  <td className="spec-cell">{item.spec}</td>
                  <td>{fmtCur(item.unit_price)}</td>
                  <td className="total-cell">{fmtCur(item.line_total)}</td>
                  {isAdmin ? (
                    <td style={{ display: "flex", gap: "0.25rem" }}>
                      <button className="edit-btn" onClick={() => editItem(item._raw)}>Edit</button>
                      <button className="edit-btn" style={{ background: "#dc2626" }} onClick={() => deleteItem(item.id)}>Del</button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td colSpan={7}>TOTAL BOM EQUIPMENT COST</td>
                <td>{fmtCur(totalBom)}</td>
                {isAdmin ? <td></td> : null}
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
function HistoryTab({ onLoad, onEdit, authHeaders, onUnauthorized }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/calculations`, { headers: authHeaders() });
        if (res.status === 401) {
          if (!cancelled) {
            setError("Session expired. Please login again.");
            onUnauthorized?.();
          }
          return;
        }
        if (!res.ok) throw new Error("Failed to load history");
        const data = await res.json();
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setRecords([]);
          setError(e.message || "Failed to load history");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [authHeaders, onUnauthorized]);

  return (
    <div className="tab-content">
      <div className="card">
        <div className="card-title">Calculation History</div>
        {error ? <div className="error-bar">{error}</div> : null}
        {loading ? <div className="loading-msg">Loading…</div> :
          records.length === 0 ? <div className="empty-msg">No calculations yet. Run an optimisation first.</div> :
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Timestamp</th><th>Use Case</th><th>CAPEX</th><th>LCOS</th><th>Payback</th><th>Actions</th></tr>
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
                        <button className="edit-btn" onClick={() => onEdit(r.id)}>Edit</button>
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

function AuthPage({ onAuthenticated, loginType = "user" }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdminLogin = loginType === "admin";
  const canSignup = !isAdminLogin;

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" || isAdminLogin ? "login" : "signup";
      const body = { email, password };
      const res = await fetch(`${API_BASE}/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Authentication failed");

      if (isAdminLogin && data?.user?.role !== "admin") {
        throw new Error("Admin account required for Admin Login");
      }

      onAuthenticated(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <h2>{isAdminLogin ? "Admin Login" : (mode === "login" ? "User Login" : "Create User Account")}</h2>
        <p>{isAdminLogin ? "Login to access the BESS admin account management page." : "Access your account-specific Supplier Engine, Analytics, and History."}</p>

        <label>Email</label>
        <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <label>Password</label>
        <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

        {error && <div className="error-bar">{error}</div>}

        <button className="calc-btn" type="submit" disabled={loading}>
          {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
        </button>

        {canSignup && (
          <button
            type="button"
            className="link-btn"
            onClick={() => setMode(mode === "login" ? "signup" : "login")}
          >
            {mode === "login" ? "Need an account? Sign up" : "Have an account? Login"}
          </button>
        )}
      </form>
    </div>
  );
}

function BessAppAdminPage({ auth, authHeaders, onLogout }) {
  const [admins, setAdmins] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const goHome = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, []);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/bess-app-admin`, {
        headers: {
          ...authHeaders(),
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load admin accounts");
      setAdmins(data.admins || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  const createAdmin = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_BASE}/bess-app-admin`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.detail || "Failed to create admin account");
      return;
    }
    setEmail("");
    setPassword("");
    loadAdmins();
  };

  if (auth?.user?.role !== "admin") {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <h2>Access Denied</h2>
          <p>Only admin users can access /bess-app-admin.</p>
          <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
            <button className="btn-secondary" onClick={goHome}>Return to Home</button>
          </div>
          <button className="calc-btn" onClick={onLogout}>Logout</button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="auth-card" style={{ maxWidth: "900px" }}>
        <h2>BESS App Admin</h2>
        <p>Create and manage admin accounts from this dedicated endpoint UI.</p>

        {auth?.user?.is_temporary_admin && (
          <div className="temp-admin-banner">
            You are logged in with the temporary admin account. Create a permanent admin account and use it for regular access.
          </div>
        )}

        <form onSubmit={createAdmin}>
          <label>New Admin Email</label>
          <input className="inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

          <label>Temporary Password</label>
          <input className="inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />

          <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
            <button className="calc-btn" type="submit">Create Admin</button>
          </div>
        </form>

        {error && (
          <>
            <div className="error-bar">{error}</div>
            {(error.toLowerCase().includes("unauthorized") || error.toLowerCase().includes("access")) && (
              <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
                <button className="btn-secondary" onClick={goHome}>Return to Home</button>
                <button className="calc-btn" onClick={onLogout}>Logout</button>
              </div>
            )}
          </>
        )}

        <div className="card" style={{ marginTop: "1rem" }}>
          <div className="card-title">Existing Admin Accounts</div>
          {loading ? <div className="loading-msg">Loading admin users...</div> : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr><th>ID</th><th>Email</th><th>Created At</th></tr>
                </thead>
                <tbody>
                  {admins.map((a) => (
                    <tr key={a.id}>
                      <td>{a.id}</td>
                      <td>{a.email}</td>
                      <td>{a.created_at ? new Date(a.created_at).toLocaleString("en-IN") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
  const [projectId, setProjectId] = useState(null);
  const [editInputs, setEditInputs] = useState(null);
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem("bess-auth");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const authHeaders = useCallback(() => {
    if (!auth?.token) return {};
    return { Authorization: `Bearer ${auth.token}` };
  }, [auth]);

  const tabs = BASE_TABS;

  const handleUnauthorized = useCallback(() => {
    setError("Session expired or unauthorized for that page.");
    setActiveTab("Project Wizard");
  }, []);

  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(inputs),
      });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
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
  }, [inputs, authHeaders, handleUnauthorized]);

  const handleLoadHistory = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/calculations/${id}`, { headers: authHeaders() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setResult({ ...data.results, inputs: data.inputs });
      setInputs(data.inputs);
      setCalcId(id);
      setActiveTab("Analytics");
    } catch (e) {
      setError(e.message);
    }
  }, [authHeaders, handleUnauthorized]);

  const handleEditHistory = useCallback(async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/calculations/${id}`, { headers: authHeaders() });
      if (res.status === 401) {
        handleUnauthorized();
        return;
      }
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      setEditInputs(data.inputs || null);
      setIsEditingHistory(true);
      setActiveTab("Project Wizard");
    } catch (e) {
      setError(e.message);
    }
  }, [authHeaders, handleUnauthorized]);

  const handleAuthenticated = useCallback((data) => {
    setError(null);
    setResult(null);
    setCalcId(null);
    setProjectId(null);
    setEditInputs(null);
    setIsEditingHistory(false);
    setActiveTab("Project Wizard");
    setAuth(data);
    localStorage.setItem("bess-auth", JSON.stringify(data));

    // Hard refresh clears stale in-memory unauthorized UI state when switching accounts.
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, []);

  const handleLogout = useCallback(() => {
    setAuth(null);
    localStorage.removeItem("bess-auth");
  }, []);

  const isBessAppAdminRoute = typeof window !== "undefined" && window.location.pathname === "/bess-app-admin";

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!isProfileOpen) return;
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isProfileOpen]);

  if (!auth?.token) {
    return <AuthPage onAuthenticated={handleAuthenticated} loginType={isBessAppAdminRoute ? "admin" : "user"} />;
  }

  if (isBessAppAdminRoute) {
    return <BessAppAdminPage auth={auth} authHeaders={authHeaders} onLogout={handleLogout} />;
  }

  return (
    <div className="bess-app">
      <header className="app-header">
        <div className="header-left">
          <img 
            src="/assets/elektron-logo.png" 
            alt="Elektron" 
            style={{
              width: '40px',
              height: '40px',
              marginRight: '12px',
              objectFit: 'contain'
            }}
          />
          <div>
            <div className="app-title">BESS Optimality</div>
            <div className="app-subtitle">Sub-MWh Battery Storage Optimisation Tool · Elektron RE</div>
          </div>
        </div>
        <div className="header-right">
          <span className="role-badge">{auth.user?.role || "user"}</span>
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button className="profile-icon-btn" onClick={() => setIsProfileOpen(v => !v)} aria-label="Open profile menu">
              <span className="profile-icon">👤</span>
            </button>
            {isProfileOpen && (
              <div className="profile-menu">
                <div className="profile-email">{auth.user?.email}</div>
                <button className="profile-logout-btn" onClick={handleLogout}>Logout</button>
              </div>
            )}
          </div>
          {calcId && <span className="calc-badge">Calc #{calcId}</span>}
          {result && (
            <div className="header-kpis">
              <div className="h-kpi"><span className="h-kpi-val">{result.sizing?.actual_installed_kwh} kWh</span><span className="h-kpi-label">Installed</span></div>
              <div className="h-kpi"><span className="h-kpi-val">₹{fmt(result.lcos?.lcos_inr_per_kwh, 2)}</span><span className="h-kpi-label">LCOS/kWh</span></div>
              <div className="h-kpi"><span className="h-kpi-val">{result.roi?.simple_payback_yrs} yrs</span><span className="h-kpi-label">Payback</span></div>
            </div>
          )}
          <LogoutButton />
        </div>
      </header>

      <nav className="tab-nav">
        {tabs.map(t => (
          <button
            key={t}
            className={`tab-btn ${activeTab === t ? "active" : ""}`}
            onClick={() => setActiveTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>

      {error && (
        <div className="error-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
          <span>⚠ {error} — Check API connection (FastAPI at port 8000)</span>
          <button className="btn-secondary" onClick={() => setActiveTab("Project Wizard")}>Return to Home</button>
        </div>
      )}

      <main className="app-main">
        {activeTab === "Project Wizard" && (
          <ProjectWizard
            authToken={auth.token}
            initialInputs={editInputs}
            isEditMode={isEditingHistory}
            onCancelEdit={() => {
              setEditInputs(null);
              setIsEditingHistory(false);
            }}
            onOptimizationComplete={({ result: calcResult, inputs: calcInputs, calcId: newCalcId, projectId: newProjectId }) => {
              setResult({ ...calcResult, inputs: calcInputs });
              setInputs(calcInputs);
              setCalcId(newCalcId);
              setProjectId(newProjectId);
              setIsEditingHistory(false);
              setEditInputs(null);
              setActiveTab("Configurations");
            }}
          />
        )}
        {activeTab === "Configurations" && <ConfigurationsTab projectId={projectId} authHeaders={authHeaders} onProjectResolved={setProjectId} onUnauthorized={handleUnauthorized} />}
        {activeTab === "Supplier Engine" && <SupplierEngineTab authHeaders={authHeaders} onUnauthorized={handleUnauthorized} />}
        {activeTab === "BOM Viewer" && <BOMTab isAdmin={auth.user?.role === "admin"} authHeaders={authHeaders} />}
        {activeTab === "Analytics" && <AnalyticsTab data={result} />}
        {activeTab === "History" && <HistoryTab onLoad={handleLoadHistory} onEdit={handleEditHistory} authHeaders={authHeaders} onUnauthorized={handleUnauthorized} />}
      </main>

      <footer className="app-footer">
        Elektron RE · BESS Optimality v2.0 · FastAPI + PostgreSQL + React · Permutation Engine + Supplier Scoring
      </footer>
    </div>
  );
}
