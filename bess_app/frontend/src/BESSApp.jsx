import { useState, useEffect, useCallback } from "react";
import "./BESSApp.css";
import { ProjectWizard } from "./pages";
import { useAuthStore } from "./store/authStore";
import { useNavigate } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "https://roi-tool-6phy.onrender.com";

const fmt = (n, decimals = 0) =>
  n == null ? "—" : Number(n).toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

const fmtCur = (n) => n == null ? "—" : `₹${fmt(n)}`;
const fmtLakh = (n) => n == null ? "—" : `₹${fmt(n / 100000, 2)}L`;

const USER_TABS  = ["Project Wizard", "Configurations", "Supplier Engine", "BOM Viewer", "Analytics", "History"];
const ADMIN_TABS = ["Project Wizard", "Configurations", "Supplier Engine", "BOM Viewer", "Analytics", "History", "Admin Panel"];

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
          {loading ? "Calculating…" : "Run Optimisation"}
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

const BLANK_SUPPLIER = {
  name: "", component_category: "", country: "", tier: "Tier 1",
  price_score: "", technical_score: "", delivery_score: "",
  warranty_score: "", support_score: "", certification_score: "",
};

// ── Tab: Supplier Engine ──────────────────────────────────────────────────────
function SupplierEngineTab({ isAdmin, authHeaders, onUnauthorized }) {
  const [suppliers, setSuppliers] = useState([]);
  const [weights, setWeights] = useState({ price: 30, technical: 25, delivery: 15, warranty: 10, support: 10, cert: 10 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Admin edit state
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState(BLANK_SUPPLIER);
  const [editingId, setEditingId] = useState(null);
  const [catFilter, setCatFilter] = useState("All");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [suppliersRes, weightsRes] = await Promise.all([
        fetch(`${API_BASE}/api/suppliers`, { headers: authHeaders() }),
        fetch(`${API_BASE}/api/scoring-weights`, { headers: authHeaders() }),
      ]);
      if (suppliersRes.status === 401 || weightsRes.status === 401) {
        onUnauthorized?.();
        return;
      }
      if (!suppliersRes.ok) throw new Error("Failed to load suppliers");
      const suppliersData = await suppliersRes.json();
      const weightsData = weightsRes.ok ? await weightsRes.json() : {};
      setSuppliers(Array.isArray(suppliersData) ? suppliersData : []);
      setWeights(prev => ({ ...prev, ...(weightsData?.weights || {}) }));
    } catch (e) {
      setError(e.message || "Failed to load supplier data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const handleSaveWeights = async () => {
    await fetch(`${API_BASE}/api/scoring-weights`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ weights }),
    });
    flash("Weights saved.");
  };

  // Admin: compute weighted score from draft fields (stored 0-10, API returns ×10)
  const calcWeighted = (d) => {
    const p = parseFloat(d.price_score) || 0;
    const t = parseFloat(d.technical_score) || 0;
    const de = parseFloat(d.delivery_score) || 0;
    const w = parseFloat(d.warranty_score) || 0;
    const s = parseFloat(d.support_score) || 0;
    const c = parseFloat(d.certification_score) || 0;
    return parseFloat((p * 0.20 + t * 0.30 + de * 0.15 + w * 0.15 + s * 0.10 + c * 0.10).toFixed(2));
  };

  const saveSupplier = async () => {
    setError("");
    if (!draft.name.trim()) { setError("Supplier name is required."); return; }
    // Convert 0-100 display scores back to 0-10 for storage
    const toStore = (v) => v === "" ? null : parseFloat(v) / 10;
    const payload = {
      name: draft.name.trim(),
      component_category: draft.component_category || null,
      country: draft.country || null,
      tier: draft.tier || null,
      price_score: toStore(draft.price_score),
      technical_score: toStore(draft.technical_score),
      delivery_score: toStore(draft.delivery_score),
      warranty_score: toStore(draft.warranty_score),
      support_score: toStore(draft.support_score),
      certification_score: toStore(draft.certification_score),
    };
    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${API_BASE}/api/admin/suppliers/${editingId}`
      : `${API_BASE}/api/admin/suppliers`;
    const res = await fetch(url, {
      method,
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.status === 401) { onUnauthorized?.(); return; }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.detail || "Failed to save supplier");
      return;
    }
    setDraft(BLANK_SUPPLIER);
    setEditingId(null);
    setShowForm(false);
    await loadData();
    flash(editingId ? "Supplier updated." : "Supplier added.");
  };

  const startEdit = (s) => {
    // API returns ×10 scores, form uses 0-100
    setDraft({
      name: s.name,
      component_category: s.component_category || "",
      country: s.country || "",
      tier: s.tier || "Tier 1",
      price_score: s.price_score ?? "",
      technical_score: s.technical_score ?? "",
      delivery_score: s.delivery_score ?? "",
      warranty_score: s.warranty_score ?? "",
      support_score: s.support_score ?? "",
      certification_score: s.certification_score ?? "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const deleteSupplier = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    const res = await fetch(`${API_BASE}/api/admin/suppliers/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.status === 401) { onUnauthorized?.(); return; }
    if (!res.ok) { setError("Failed to delete supplier"); return; }
    await loadData();
    flash("Supplier deleted.");
  };

  const categories = ["All", ...new Set(suppliers.map(s => s.component_category).filter(Boolean))];
  const filtered = catFilter === "All" ? suppliers : suppliers.filter(s => s.component_category === catFilter);

  if (loading) return <div className="loading-msg">Loading supplier engine…</div>;

  return (
    <div className="tab-content">
      {error && <div className="error-bar">{error}</div>}
      {successMsg && <div className="success-bar">{successMsg}</div>}

      <div className="kpi-row">
        <KPICard label="Total Suppliers" value={suppliers.length} accent="blue" />
        <KPICard label="Categories" value={categories.length - 1} accent="green" />
        <KPICard label="Weight: Technical" value={`${weights?.technical ?? 25}%`} accent="amber" />
      </div>

      {/* Admin: Add / Edit form */}
      {isAdmin && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
            <button className="load-btn" onClick={() => { setShowForm(v => !v); setDraft(BLANK_SUPPLIER); setEditingId(null); }}>
              {showForm ? "Close Form" : "Add New Supplier"}
            </button>
          </div>

          {showForm && (
            <>
              <div className="section-header" style={{ marginTop: "1rem" }}><span>{editingId ? "Edit Supplier" : "New Supplier"}</span></div>
              <div className="two-col" style={{ marginTop: "0.5rem" }}>
                <div>
                  <label className="input-label">Supplier Name *</label>
                  <input className="inp" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="e.g., Sungrow" />
                </div>
                <div>
                  <label className="input-label">Component Category</label>
                  <input className="inp" value={draft.component_category} onChange={e => setDraft({ ...draft, component_category: e.target.value })} placeholder="e.g., BATTERY SYSTEM" />
                </div>
                <div>
                  <label className="input-label">Country</label>
                  <input className="inp" value={draft.country} onChange={e => setDraft({ ...draft, country: e.target.value })} placeholder="e.g., India" />
                </div>
                <div>
                  <label className="input-label">Tier</label>
                  <select className="inp" value={draft.tier} onChange={e => setDraft({ ...draft, tier: e.target.value })}>
                    <option>Tier 1</option><option>Tier 2</option><option>Tier 3</option>
                  </select>
                </div>
              </div>
              <div className="section-header" style={{ marginTop: "1rem" }}><span>Scores (0 – 100)</span></div>
              <div className="two-col" style={{ marginTop: "0.5rem" }}>
                {[
                  ["price_score",   "Price Score"],
                  ["technical_score", "Technical Score"],
                  ["delivery_score", "Delivery Score"],
                  ["warranty_score", "Warranty Score"],
                  ["support_score",  "Support Score"],
                  ["certification_score", "Certification Score"],
                ].map(([key, label]) => (
                  <div key={key}>
                    <label className="input-label">{label}</label>
                    <input className="inp" type="number" min="0" max="100" step="0.1"
                      value={draft[key]}
                      onChange={e => setDraft({ ...draft, [key]: e.target.value })}
                      placeholder="0–100" />
                  </div>
                ))}
              </div>
              <div className="calc-btn-row" style={{ justifyContent: "flex-start", marginTop: "1rem" }}>
                <button className="calc-btn" onClick={saveSupplier}>{editingId ? "Update Supplier" : "Save Supplier"}</button>
                {editingId && (
                  <button className="btn-secondary" onClick={() => { setDraft(BLANK_SUPPLIER); setEditingId(null); setShowForm(false); }}>
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="two-col">
        {/* Scoring weights — admin editable, user read-only */}
        <div className="card">
          <div className="card-title">Scoring Weights</div>
          {Object.entries(weights || {}).map(([key, val]) => (
            <div key={key} className="input-row">
              <label className="input-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              {isAdmin ? (
                <input type="number" value={val}
                  onChange={e => setWeights({ ...weights, [key]: parseInt(e.target.value) })}
                  className="inp" min="0" max="100" />
              ) : (
                <span className="inp" style={{ display: "flex", alignItems: "center", color: "var(--text)" }}>{val}</span>
              )}
              <span className="input-unit">%</span>
            </div>
          ))}
          {isAdmin && (
            <button className="calc-btn" onClick={handleSaveWeights} style={{ marginTop: "1rem" }}>Save Weights</button>
          )}
        </div>

        {/* Supplier table with category filter */}
        <div className="card">
          <div className="card-title">Supplier Rankings</div>
          <div className="bom-filter-row" style={{ marginBottom: "0.5rem" }}>
            {categories.map(c => (
              <button key={c} className={`filter-btn ${catFilter === c ? "active" : ""}`} onClick={() => setCatFilter(c)}>{c}</button>
            ))}
          </div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th><th>Category</th><th>Country</th>
                  <th>Price</th><th>Tech</th><th>Delivery</th><th>Weighted</th>
                  {isAdmin && <th>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td><span className="cat-badge">{s.component_category}</span></td>
                    <td>{s.country || "—"}</td>
                    <td>{s.price_score ?? "—"}</td>
                    <td>{s.technical_score ?? "—"}</td>
                    <td>{s.delivery_score ?? "—"}</td>
                    <td className={s.weighted_score > 70 ? "pos" : ""}><strong>{s.weighted_score ?? "—"}</strong></td>
                    {isAdmin && (
                      <td style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="edit-btn" onClick={() => startEdit(s)}>Edit</button>
                        <button className="edit-btn" style={{ background: "#dc2626" }} onClick={() => deleteSupplier(s.id)}>Del</button>
                      </td>
                    )}
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

  const { sizing, capex, opex, lcos, savings, roi, cashflow_years, sensitivity, inputs } = data;
  const breakeven = cashflow_years?.find(y => y.cumulative_net >= 0);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Helper to format data for exports
  const getReportData = () => {
    const reportDate = new Date().toLocaleString();
    return {
      reportDate,
      projectInputs: inputs || {},
      sizing: sizing || {},
      capex: capex || {},
      opex: opex || {},
      lcos: lcos || {},
      savings: savings || {},
      roi: roi || {},
      cashflow_years: cashflow_years || [],
      sensitivity: sensitivity || {}
    };
  };

  const downloadCSV = () => {
    const r = getReportData();
    const sections = [];

    // Project Information
    sections.push(["BESS COMPREHENSIVE PROJECT REPORT"], ["Generated:", r.reportDate], [""], [""]);

    // Project Wizard Inputs
    sections.push(["PROJECT WIZARD INPUTS"], [""]);
    sections.push(["Parameter", "Value"]);
    if (r.projectInputs) {
      sections.push(["Peak Demand (kW)", r.projectInputs.peak_demand_kw]);
      sections.push(["Load Growth (%)", r.projectInputs.load_growth_pct]);
      sections.push(["Peak Hours", r.projectInputs.peak_hours]);
      sections.push(["Off-Peak Hours", r.projectInputs.off_peak_hours]);
      sections.push(["Peak Tariff (INR/kWh)", r.projectInputs.peak_tariff]);
      sections.push(["Off-Peak Tariff (INR/kWh)", r.projectInputs.off_peak_tariff]);
      sections.push(["Solar Generation (kWh/kWp/day)", r.projectInputs.solar_gen_per_kwp_day]);
      sections.push(["Solar Capital Cost (INR/kWp)", r.projectInputs.solar_capex_per_kwp]);
      sections.push(["Battery Module (kWh)", r.projectInputs.battery_module_kwh]);
      sections.push(["Battery Unit Price (INR/kWh)", r.projectInputs.battery_unit_price_inr_per_kwh]);
    }
    sections.push([""], [""]);

    // Sizing Summary
    sections.push(["SYSTEM SIZING"], [""]);
    sections.push(["Parameter", "Value"]);
    if (r.sizing) {
      sections.push(["BESS Capacity (kWh)", r.sizing.bess_kwh]);
      sections.push(["BESS Power (kW)", r.sizing.bess_kw]);
      sections.push(["Solar Capacity (kWp)", r.sizing.solar_kwp]);
      sections.push(["Battery Modules", r.sizing.num_modules]);
      sections.push(["Inverters", r.sizing.num_inverters]);
      sections.push(["Rack Estimate", r.sizing.rack_estimate]);
    }
    sections.push([""], [""]);

    // CAPEX Breakdown
    sections.push(["CAPITAL EXPENDITURE (CAPEX)"], [""]);
    sections.push(["Item", "Value (INR)"]);
    if (r.capex) {
      sections.push(["Battery Cost", r.capex.battery_cost]);
      sections.push(["PCS/Inverter Cost", r.capex.pcs_cost]);
      sections.push(["BOS Cost", r.capex.bos_cost]);
      sections.push(["Solar Cost", r.capex.solar_cost]);
      sections.push(["Installation Cost", r.capex.installation_cost]);
      sections.push(["TOTAL CAPEX", r.capex.total_capex]);
    }
    sections.push([""], [""]);

    // OPEX Breakdown
    sections.push(["OPERATIONAL EXPENDITURE (OPEX) - Annual"], [""]);
    sections.push(["Item", "Value (INR/year)"]);
    if (r.opex) {
      sections.push(["Battery Replacement", r.opex.battery_replacement]);
      sections.push(["Maintenance", r.opex.maintenance]);
      sections.push(["Insurance", r.opex.insurance]);
      sections.push(["O&M Solar", r.opex.om_solar]);
      sections.push(["Annual OPEX", r.opex.annual_opex]);
    }
    sections.push([""], [""]);

    // Analytics Summary
    sections.push(["FINANCIAL ANALYTICS"], [""]);
    sections.push(["Metric", "Value"]);
    if (r.lcos) sections.push(["LCOS", `${fmt(r.lcos.lcos_inr_per_kwh, 2)} INR/kWh`]);
    if (r.roi) {
      sections.push(["Simple Payback", `${fmt(r.roi.simple_payback_yrs, 1)} years`]);
      sections.push(["10-Year ROI", `${fmt(r.roi.roi_10yr_pct, 1)}%`]);
      sections.push(["Net Annual Benefit", fmtCur(r.roi.net_annual_benefit)]);
    }
    if (r.savings) {
      sections.push(["Total Annual Savings", fmtCur(r.savings.total_annual_savings)]);
    }
    sections.push([""], [""]);

    // Cash Flow
    if (r.cashflow_years && r.cashflow_years.length > 0) {
      sections.push(["10-YEAR CASH FLOW PROJECTION"], [""]);
      sections.push(["Year", "Revenue", "OPEX", "Net Cashflow", "Cumulative"]);
      r.cashflow_years.forEach(year => {
        sections.push([
          year.year,
          year.revenue,
          year.opex,
          year.net_cashflow,
          year.cumulative_net
        ]);
      });
    }

    const csv = sections.map((r) =>
      r.map((v) => `"${String(v ?? "").replaceAll("\"", "\"\"")}"`).join(",")
    ).join("\n");

    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), "bess-complete-report.csv");
  };

  const downloadExcel = () => {
    const r = getReportData();
    const XLSX = window.XLSX || require('xlsx');

    const wb = XLSX.utils.book_new();

    // Sheet 1: Project Summary
    const summaryData = [
      ["BESS PROJECT REPORT", ""],
      ["Generated", r.reportDate],
      ["", ""],
      ["SYSTEM SIZING", ""],
      ["BESS Capacity", r.sizing?.bess_kwh, "kWh"],
      ["BESS Power", r.sizing?.bess_kw, "kW"],
      ["Solar Capacity", r.sizing?.solar_kwp, "kWp"],
      ["", ""],
      ["FINANCIAL SUMMARY", ""],
      ["Total CAPEX", r.capex?.total_capex, "INR"],
      ["Annual OPEX", r.opex?.annual_opex, "INR"],
      ["LCOS", r.lcos?.lcos_inr_per_kwh, "INR/kWh"],
      ["Simple Payback", r.roi?.simple_payback_yrs, "years"],
      ["10-Year ROI", r.roi?.roi_10yr_pct, "%"],
      ["Net Annual Benefit", r.roi?.net_annual_benefit, "INR"],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, "Summary");

    // Sheet 2: Project Inputs
    const inputsData = [["Parameter", "Value", "Unit"]];
    if (r.projectInputs) {
      inputsData.push(
        ["Peak Demand", r.projectInputs.peak_demand_kw, "kW"],
        ["Load Growth", r.projectInputs.load_growth_pct, "%"],
        ["Peak Hours", r.projectInputs.peak_hours, "hours"],
        ["Off-Peak Hours", r.projectInputs.off_peak_hours, "hours"],
        ["Peak Tariff", r.projectInputs.peak_tariff, "INR/kWh"],
        ["Off-Peak Tariff", r.projectInputs.off_peak_tariff, "INR/kWh"],
        ["Solar Generation", r.projectInputs.solar_gen_per_kwp_day, "kWh/kWp/day"],
        ["Solar CAPEX", r.projectInputs.solar_capex_per_kwp, "INR/kWp"],
        ["Battery Module", r.projectInputs.battery_module_kwh, "kWh"],
        ["Battery Price", r.projectInputs.battery_unit_price_inr_per_kwh, "INR/kWh"],
        ["Battery Cycles", r.projectInputs.battery_cycles, "cycles"],
        ["DoD", r.projectInputs.depth_of_discharge_pct, "%"],
        ["Charging Efficiency", r.projectInputs.charging_efficiency_pct, "%"],
        ["Discount Rate", r.projectInputs.discount_rate_pct, "%"],
        ["Analysis Years", r.projectInputs.analysis_years, "years"],
        ["Daily Cycles", r.projectInputs.daily_cycles, "cycles"],
      );
    }
    const ws2 = XLSX.utils.aoa_to_sheet(inputsData);
    XLSX.utils.book_append_sheet(wb, ws2, "Project Inputs");

    // Sheet 3: CAPEX Breakdown
    const capexData = [["Item", "Cost (INR)", "% of Total"]];
    if (r.capex) {
      const total = r.capex.total_capex || 1;
      capexData.push(
        ["Battery Cost", r.capex.battery_cost, ((r.capex.battery_cost/total)*100).toFixed(1)],
        ["PCS/Inverter Cost", r.capex.pcs_cost, ((r.capex.pcs_cost/total)*100).toFixed(1)],
        ["Balance of System", r.capex.bos_cost, ((r.capex.bos_cost/total)*100).toFixed(1)],
        ["Solar PV Cost", r.capex.solar_cost, ((r.capex.solar_cost/total)*100).toFixed(1)],
        ["Installation", r.capex.installation_cost, ((r.capex.installation_cost/total)*100).toFixed(1)],
        ["TOTAL CAPEX", r.capex.total_capex, "100%"],
      );
    }
    const ws3 = XLSX.utils.aoa_to_sheet(capexData);
    XLSX.utils.book_append_sheet(wb, ws3, "CAPEX");

    // Sheet 4: Cash Flow
    if (r.cashflow_years && r.cashflow_years.length > 0) {
      const cfData = [["Year", "Revenue (INR)", "OPEX (INR)", "Net Cashflow (INR)", "Cumulative Net (INR)"]];
      r.cashflow_years.forEach(y => {
        cfData.push([y.year, y.revenue, y.opex, y.net_cashflow, y.cumulative_net]);
      });
      const ws4 = XLSX.utils.aoa_to_sheet(cfData);
      XLSX.utils.book_append_sheet(wb, ws4, "Cash Flow");
    }

    XLSX.writeFile(wb, "bess-complete-report.xlsx");
  };

  const downloadPDF = async () => {
    const { jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const r = getReportData();

    const doc = new jsPDF();
    let y = 16;

    // Title
    doc.setFontSize(18);
    doc.text("BESS Project Report", 14, y);
    y += 8;

    doc.setFontSize(10);
    doc.text(`Generated: ${r.reportDate}`, 14, y);
    y += 12;

    // Project Inputs Section
    doc.setFontSize(14);
    doc.text("1. Project Wizard Inputs", 14, y);
    y += 8;

    if (r.projectInputs) {
      autoTable(doc, {
        startY: y,
        head: [["Parameter", "Value"]],
        body: [
          ["Peak Demand", `${r.projectInputs.peak_demand_kw} kW`],
          ["Peak Hours", `${r.projectInputs.peak_hours} hrs`],
          ["Peak Tariff", `₹${r.projectInputs.peak_tariff}/kWh`],
          ["Off-Peak Tariff", `₹${r.projectInputs.off_peak_tariff}/kWh`],
          ["Solar Generation", `${r.projectInputs.solar_gen_per_kwp_day} kWh/kWp/day`],
          ["Battery Module", `${r.projectInputs.battery_module_kwh} kWh`],
          ["Battery Price", `₹${fmt(r.projectInputs.battery_unit_price_inr_per_kwh)}/kWh`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Sizing Section
    doc.setFontSize(14);
    doc.text("2. System Sizing", 14, y);
    y += 8;

    if (r.sizing) {
      autoTable(doc, {
        startY: y,
        head: [["Component", "Size", "Units"]],
        body: [
          ["BESS Capacity", fmt(r.sizing.bess_kwh), "kWh"],
          ["BESS Power", fmt(r.sizing.bess_kw), "kW"],
          ["Solar PV", fmt(r.sizing.solar_kwp), "kWp"],
          ["Battery Modules", r.sizing.num_modules, "modules"],
          ["Inverters", r.sizing.num_inverters, "units"],
          ["Battery Racks", r.sizing.rack_estimate, "racks"],
        ],
        theme: 'grid',
        headStyles: { fillColor: [46, 204, 113] },
        styles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 10;
    }

    // Financial Summary Section
    doc.setFontSize(14);
    doc.text("3. Financial Summary", 14, y);
    y += 8;

    const finBody = [];
    if (r.capex) finBody.push(["Total CAPEX", fmtCur(r.capex.total_capex)]);
    if (r.opex) finBody.push(["Annual OPEX", fmtCur(r.opex.annual_opex)]);
    if (r.lcos) finBody.push(["Levelized Cost (LCOS)", `₹${fmt(r.lcos.lcos_inr_per_kwh, 2)}/kWh`]);
    if (r.roi) {
      finBody.push(["Simple Payback", `${fmt(r.roi.simple_payback_yrs, 1)} years`]);
      finBody.push(["10-Year ROI", `${fmt(r.roi.roi_10yr_pct, 1)}%`]);
      finBody.push(["Net Annual Benefit", fmtCur(r.roi.net_annual_benefit)]);
    }
    if (r.savings) finBody.push(["Annual Savings", fmtCur(r.savings.total_annual_savings)]);

    autoTable(doc, {
      startY: y,
      head: [["Metric", "Value"]],
      body: finBody,
      theme: 'grid',
      headStyles: { fillColor: [231, 76, 60] },
      styles: { fontSize: 9 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Cash Flow Table (if space permits)
    if (r.cashflow_years && r.cashflow_years.length > 0 && y < 200) {
      doc.addPage();
      y = 16;
      doc.setFontSize(14);
      doc.text("4. 10-Year Cash Flow Projection", 14, y);
      y += 8;

      autoTable(doc, {
        startY: y,
        head: [["Year", "Revenue", "OPEX", "Net Cashflow", "Cumulative"]],
        body: r.cashflow_years.slice(0, 10).map(y => [
          y.year,
          fmtCur(y.revenue),
          fmtCur(y.opex),
          fmtCur(y.net_cashflow),
          fmtCur(y.cumulative_net)
        ]),
        theme: 'grid',
        headStyles: { fillColor: [155, 89, 182] },
        styles: { fontSize: 8 },
      });
    }

    doc.save("bess-complete-report.pdf");
  };

  const downloadDOCX = async () => {
    const { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType } = await import("docx");
    const r = getReportData();

    const createCell = (text, bold = false) => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: String(text), bold, size: 20 })]
      })]
    });

    const createRow = (cells) => new TableRow({ children: cells.map((c, i) => createCell(c, i === 0)) });

    const children = [
      new Paragraph({ children: [new TextRun({ text: "BESS Project Report", bold: true, size: 32 })] }),
      new Paragraph({ children: [new TextRun({ text: `Generated: ${r.reportDate}`, size: 20 })] }),
      new Paragraph(""),
    ];

    // Project Inputs Table
    children.push(new Paragraph({ children: [new TextRun({ text: "1. Project Wizard Inputs", bold: true, size: 24 })] }));
    children.push(new Paragraph(""));

    if (r.projectInputs) {
      const inputRows = [
        createRow(["Parameter", "Value"]),
        createRow(["Peak Demand", `${r.projectInputs.peak_demand_kw} kW`]),
        createRow(["Peak Hours", `${r.projectInputs.peak_hours} hours`]),
        createRow(["Peak Tariff", `₹${r.projectInputs.peak_tariff}/kWh`]),
        createRow(["Off-Peak Tariff", `₹${r.projectInputs.off_peak_tariff}/kWh`]),
        createRow(["Solar Generation", `${r.projectInputs.solar_gen_per_kwp_day} kWh/kWp/day`]),
        createRow(["Battery Module Capacity", `${r.projectInputs.battery_module_kwh} kWh`]),
        createRow(["Battery Unit Price", `₹${fmt(r.projectInputs.battery_unit_price_inr_per_kwh)}/kWh`]),
      ];
      children.push(new Table({ rows: inputRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(new Paragraph(""));
    }

    // System Sizing
    children.push(new Paragraph({ children: [new TextRun({ text: "2. System Sizing", bold: true, size: 24 })] }));
    children.push(new Paragraph(""));

    if (r.sizing) {
      const sizingRows = [
        createRow(["Component", "Value"]),
        createRow(["BESS Energy Capacity", `${fmt(r.sizing.bess_kwh)} kWh`]),
        createRow(["BESS Power Rating", `${fmt(r.sizing.bess_kw)} kW`]),
        createRow(["Solar PV Capacity", `${fmt(r.sizing.solar_kwp)} kWp`]),
        createRow(["Battery Modules", `${r.sizing.num_modules} units`]),
        createRow(["Inverters", `${r.sizing.num_inverters} units`]),
      ];
      children.push(new Table({ rows: sizingRows, width: { size: 100, type: WidthType.PERCENTAGE } }));
      children.push(new Paragraph(""));
    }

    // Financial Summary
    children.push(new Paragraph({ children: [new TextRun({ text: "3. Financial Analytics", bold: true, size: 24 })] }));
    children.push(new Paragraph(""));

    const finRows = [createRow(["Metric", "Value"])];
    if (r.capex) finRows.push(createRow(["Total CAPEX", fmtCur(r.capex.total_capex)]));
    if (r.opex) finRows.push(createRow(["Annual OPEX", fmtCur(r.opex.annual_opex)]));
    if (r.lcos) finRows.push(createRow(["Levelized Cost of Storage (LCOS)", `₹${fmt(r.lcos.lcos_inr_per_kwh, 2)}/kWh`]));
    if (r.roi) {
      finRows.push(createRow(["Simple Payback Period", `${fmt(r.roi.simple_payback_yrs, 1)} years`]));
      finRows.push(createRow(["10-Year ROI", `${fmt(r.roi.roi_10yr_pct, 1)}%`]));
      finRows.push(createRow(["Net Annual Benefit", fmtCur(r.roi.net_annual_benefit)]));
    }
    if (r.savings) finRows.push(createRow(["Annual Savings", fmtCur(r.savings.total_annual_savings)]));

    children.push(new Table({ rows: finRows, width: { size: 100, type: WidthType.PERCENTAGE } }));

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    downloadBlob(blob, "bess-complete-report.docx");
  };

  return (
    <div className="tab-content">
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title">Export Complete Project Report</div>
        <div className="calc-btn-row" style={{ justifyContent: "flex-start", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="load-btn" onClick={downloadPDF} title="Download PDF report with all project data">
            📄 PDF
          </button>
          <button className="load-btn" onClick={downloadDOCX} title="Download Word document">
            📝 DOCX
          </button>
          <button className="load-btn" onClick={downloadExcel} title="Download Excel workbook with multiple sheets">
            📊 Excel
          </button>
          <button className="load-btn" onClick={downloadCSV} title="Download CSV data file">
            CSV
          </button>
        </div>
        <p style={{ fontSize: "12px", color: "#8b949e", marginTop: "0.5rem" }}>
          Exports complete project data from Wizard inputs through Analysis including sizing, CAPEX/OPEX breakdown, and financial projections.
        </p>
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

function buildBomFromSizing(sizing, inputs) {
  if (!sizing) return null;
  const { num_modules, module_kwh, num_inverters, inverter_kw } = sizing;
  const mKwh = module_kwh || inputs?.battery_module_kwh || 52.25;
  const iKw = inverter_kw || 50;   // backend uses 50 kW inverters
  const nMod = num_modules || 1;
  const nInv = num_inverters || 1;

  const battery_cost_per_kwh = 8000;
  const batteryUnitPrice = mKwh * battery_cost_per_kwh;
  const batteryTotal = nMod * batteryUnitPrice;

  const racks = Math.max(1, Math.floor((nMod * mKwh) / 100) + 1);
  const rackPrice = 75000;

  const inverterUnitPrice = iKw * 3500;
  const bmsPrice = batteryTotal * 0.10;

  return [
    { id: 1, category: "Battery System",          description: `LFP Battery Module ${mKwh} kWh`,   qty: nMod,  unit: "module",  spec: `${mKwh} kWh, 3.2V LFP, 8000 cycles, 10 yr warranty`,     unit_price: batteryUnitPrice },
    { id: 2, category: "Enclosure",                description: "Battery Cabinet with Cooling",      qty: racks, unit: "cabinet", spec: "IP55, Active cooling, Fire suppression ready",              unit_price: rackPrice },
    { id: 3, category: "Power Conversion System",  description: `PCS / Inverter ${iKw} kW`,         qty: nInv,  unit: "unit",    spec: `${iKw} kW, 3-phase, 415V, 97.5% efficiency`,               unit_price: inverterUnitPrice },
    { id: 4, category: "BMS",                      description: "Battery Management System",         qty: 1,     unit: "set",     spec: "Cell balancing, SOC/SOH monitoring, CAN/Modbus",           unit_price: bmsPrice },
    { id: 5, category: "EMS",                      description: "Energy Management System",          qty: 1,     unit: "set",     spec: "Arbitrage control, scheduling, reporting",                  unit_price: 150000 },
    { id: 6, category: "AC Side",                  description: "AC & DC Switchgear",               qty: 1,     unit: "set",     spec: "ACB, MCCB, DC breakers, fuses",                            unit_price: 125000 },
    { id: 7, category: "DC Side",                  description: "HV Cables, Busbar, Connectors",    qty: 1,     unit: "lot",     spec: "Fire retardant, UV resistant",                              unit_price: 50000 },
  ].map(item => ({ ...item, line_total: item.qty * item.unit_price }));
}

const BLANK_BOM_ITEM = { category: "", description: "", qty: "1", unit: "pcs", spec: "", unit_price: "" };

function BOMTab({ isAdmin, authHeaders, result }) {
  const sizing = result?.sizing;
  const inputs = result?.inputs;
  const hasSizing = !!sizing;

  // Sizing-based BOM items (computed, editable in-session)
  const [bomItems, setBomItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ qty: "", unit_price: "", description: "", spec: "", category: "", unit: "" });
  const [filter, setFilter] = useState("All");

  // Add-component form (shown in sized BOM mode for all users)
  const [showAddForm, setShowAddForm] = useState(false);
  const [addDraft, setAddDraft] = useState(BLANK_BOM_ITEM);

  // Catalog items (from DB — shown when no optimization has run yet)
  const [catalogItems, setCatalogItems] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  // Admin catalog CRUD state
  const [showCatalogForm, setShowCatalogForm] = useState(false);
  const [catalogEditId, setCatalogEditId] = useState(null);
  const [catalogDraft, setCatalogDraft] = useState({ category: "", description: "", qty: "", unit: "", spec: "", unit_price: "" });

  // Always load catalog on mount (used as fallback + admin management)
  const loadCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const res = await fetch(`${API_BASE}/api/admin/bom`, { headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to load BOM");
      const data = await res.json();
      setCatalogItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setCatalogError(e.message || "Failed to load BOM");
    } finally {
      setCatalogLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => { loadCatalog(); }, [loadCatalog]);

  // Recompute BOM from sizing whenever a new optimization runs
  useEffect(() => {
    if (!sizing) return;
    const computed = buildBomFromSizing(sizing, inputs);
    if (computed) {
      setBomItems(computed);
      setEditingId(null);
      setFilter("All");
    }
  }, [sizing]);

  // ── Inline edit (sizing-based BOM) ──
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDraft({
      qty: String(item.qty),
      unit_price: String(item.unit_price),
      description: item.description,
      spec: item.spec,
      category: item.category,
      unit: item.unit,
    });
  };

  const saveEdit = (id) => {
    setBomItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      const qty = Number(editDraft.qty) || item.qty;
      const unit_price = Number(editDraft.unit_price) || item.unit_price;
      return {
        ...item,
        qty,
        unit_price,
        line_total: qty * unit_price,
        description: editDraft.description || item.description,
        spec: editDraft.spec !== undefined ? editDraft.spec : item.spec,
        category: editDraft.category || item.category,
        unit: editDraft.unit || item.unit,
      };
    }));
    setEditingId(null);
  };

  // ── Add new component to sized BOM ──
  const addComponent = () => {
    const qty = Number(addDraft.qty) || 1;
    const unit_price = Number(addDraft.unit_price) || 0;
    const newItem = {
      id: Date.now(),  // temp id
      category: addDraft.category || "Custom",
      description: addDraft.description,
      qty,
      unit: addDraft.unit || "pcs",
      spec: addDraft.spec,
      unit_price,
      line_total: qty * unit_price,
    };
    setBomItems(prev => [...prev, newItem]);
    setAddDraft(BLANK_BOM_ITEM);
    setShowAddForm(false);
  };

  // ── Delete a row from sized BOM ──
  const deleteItem = (id) => {
    setBomItems(prev => prev.filter(item => item.id !== id));
  };

  // ── Catalog CRUD (admin) ──
  const resetCatalogDraft = () => {
    setCatalogEditId(null);
    setCatalogDraft({ category: "", description: "", qty: "", unit: "", spec: "", unit_price: "" });
    setShowCatalogForm(false);
  };

  const startCatalogEdit = (item) => {
    setCatalogEditId(item.id);
    setCatalogDraft({
      category: item.category || "",
      description: item.description || "",
      qty: String(Number(item.qty_formula) || ""),
      unit: item.unit || "",
      spec: item.spec || "",
      unit_price: String(item.unit_price ?? ""),
    });
    setShowCatalogForm(true);
  };

  const saveCatalogItem = async () => {
    setCatalogError("");
    const isEditing = catalogEditId !== null;
    const endpoint = isEditing ? `${API_BASE}/api/admin/bom/${catalogEditId}` : `${API_BASE}/api/admin/bom`;
    const method = isEditing ? "PUT" : "POST";
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          category: catalogDraft.category,
          subcategory: "",
          description: catalogDraft.description,
          spec: catalogDraft.spec,
          qty_formula: String(Number(catalogDraft.qty) || 1),
          unit: catalogDraft.unit || "pcs",
          unit_price: Number(catalogDraft.unit_price) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Failed to save BOM item");
      }
      resetCatalogDraft();
      await loadCatalog();
    } catch (e) {
      setCatalogError(e.message || "Failed to save BOM item");
    }
  };

  const deleteCatalogItem = async (id) => {
    if (!window.confirm("Delete this catalog item?")) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/bom/${id}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) throw new Error("Failed to delete");
      await loadCatalog();
    } catch (e) {
      setCatalogError(e.message || "Failed to delete");
    }
  };

  // ── Determine display items ──
  // After optimization: use sizing-based computed BOM
  // Before optimization: show catalog items with their default quantities
  const displayItems = hasSizing
    ? bomItems
    : catalogItems.map(item => {
        const qty = Number(item.qty_formula) || 1;
        const unitPrice = Number(item.unit_price) || 0;
        return { id: item.id, category: item.category, description: item.description, qty, unit: item.unit || "pcs", spec: item.spec || "", unit_price: unitPrice, line_total: qty * unitPrice, _catalogRaw: item };
      });

  const cats = [...new Set(displayItems.map(i => i.category).filter(Boolean))];
  const filtered = filter === "All" ? displayItems : displayItems.filter(i => i.category === filter);
  const totalBom = filtered.reduce((sum, i) => sum + (Number(i.line_total) || 0), 0);
  const batteryItem = filtered.find(i => i.category === "Battery System" || i.category === "Battery");
  const batteryShare = totalBom > 0 ? ((batteryItem?.line_total || 0) / totalBom) * 100 : 0;

  if (catalogLoading) return <div className="tab-content"><div className="loading-msg">Loading BOM…</div></div>;

  return (
    <div className="tab-content">
      {catalogError && <div className="error-bar">{catalogError}</div>}

      {/* Banner: shows source of BOM data */}
      <div className="card" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", background: "var(--surface-2, #161b22)", borderLeft: `3px solid ${hasSizing ? "var(--teal, #14b8a6)" : "var(--amber, #f59e0b)"}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          {hasSizing ? (
            <>
              <span style={{ color: "var(--teal, #14b8a6)", fontWeight: 600, fontSize: "13px" }}>Sized from Project Wizard</span>
              <span style={{ color: "#8b949e", fontSize: "12px" }}>
                {sizing.num_modules} modules × {inputs?.battery_module_kwh || 52.25} kWh &nbsp;|&nbsp;
                {sizing.num_inverters} inverters × 50 kW &nbsp;|&nbsp;
                {fmt(sizing.actual_installed_kwh)} kWh installed
              </span>
              <span style={{ marginLeft: "auto", color: "#8b949e", fontSize: "11px" }}>Click Edit to adjust qty or price</span>
            </>
          ) : (
            <>
              <span style={{ color: "var(--amber, #f59e0b)", fontWeight: 600, fontSize: "13px" }}>Component Catalog (Default)</span>
              <span style={{ color: "#8b949e", fontSize: "12px" }}>Run an optimisation to get quantities sized to your project</span>
            </>
          )}
        </div>
      </div>

      <div className="kpi-row">
        <KPICard label="Total BOM Cost" value={fmtCur(totalBom)} accent="red" />
        <KPICard label="Line Items" value={filtered.length} accent="blue" />
        <KPICard label="Battery Share" value={`${fmt(batteryShare, 1)}%`} sub="of total BOM" accent="amber" />
        {hasSizing && <KPICard label="Installed Capacity" value={`${fmt(sizing.actual_installed_kwh)} kWh`} accent="green" />}
      </div>

      <div className="bom-filter-row">
        {["All", ...cats].map(c => (
          <button key={c} className={`filter-btn ${filter === c ? "active" : ""}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      {/* Add Component button + form — available to all users in sized mode, admin in catalog mode */}
      {(hasSizing || isAdmin) && (
        <div className="card" style={{ marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span className="card-title" style={{ marginBottom: 0 }}>Add Component</span>
            <button className="load-btn" onClick={() => { setShowAddForm(v => !v); setAddDraft(BLANK_BOM_ITEM); }}>
              {showAddForm ? "Close" : "+ Add Component"}
            </button>
          </div>

          {showAddForm && (
            <div className="two-col" style={{ marginTop: "0.75rem" }}>
              <div>
                <label className="input-label">Category</label>
                <input className="inp" placeholder="e.g., Solar PV, Cabling, Civil" value={addDraft.category}
                  onChange={e => setAddDraft(d => ({ ...d, category: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Description *</label>
                <input className="inp" placeholder="e.g., Solar Inverter 50kW" value={addDraft.description}
                  onChange={e => setAddDraft(d => ({ ...d, description: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Qty *</label>
                <input className="inp" type="number" min="0" step="any" placeholder="1" value={addDraft.qty}
                  onChange={e => setAddDraft(d => ({ ...d, qty: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Unit</label>
                <input className="inp" placeholder="pcs / set / lot / m" value={addDraft.unit}
                  onChange={e => setAddDraft(d => ({ ...d, unit: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Specification</label>
                <input className="inp" placeholder="e.g., 50kW, 3-phase, IP65" value={addDraft.spec}
                  onChange={e => setAddDraft(d => ({ ...d, spec: e.target.value }))} />
              </div>
              <div>
                <label className="input-label">Unit Price (₹) *</label>
                <input className="inp" type="number" min="0" step="any" placeholder="0" value={addDraft.unit_price}
                  onChange={e => setAddDraft(d => ({ ...d, unit_price: e.target.value }))} />
              </div>
              {addDraft.qty && addDraft.unit_price && (
                <div style={{ gridColumn: "1 / -1", color: "var(--teal, #14b8a6)", fontSize: "13px" }}>
                  Line Total: {fmtCur((Number(addDraft.qty) || 0) * (Number(addDraft.unit_price) || 0))}
                </div>
              )}
              <div className="calc-btn-row" style={{ justifyContent: "flex-start", gridColumn: "1 / -1" }}>
                <button className="calc-btn"
                  disabled={!addDraft.description.trim() || !addDraft.qty || !addDraft.unit_price}
                  onClick={hasSizing ? addComponent : () => {
                    setCatalogDraft({ ...addDraft });
                    saveCatalogItem();
                    setShowAddForm(false);
                  }}>
                  Add to BOM
                </button>
                <button className="btn-secondary" onClick={() => setShowAddForm(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div className="table-scroll">
          <table className="data-table bom-table">
            <thead>
              <tr>
                <th>#</th><th>Category</th><th>Description</th>
                <th>Qty</th><th>Unit</th><th>Specification</th>
                <th>Unit Price (₹)</th><th>Line Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, idx) => (
                <tr key={item.id}>
                  <td>{idx + 1}</td>
                  {editingId === item.id ? (
                    <>
                      <td>
                        <input className="inp" style={{ width: "100px", padding: "2px 6px" }} placeholder="Category"
                          value={editDraft.category} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))} />
                      </td>
                      <td>
                        <input className="inp" style={{ width: "150px", padding: "2px 6px" }} placeholder="Description"
                          value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
                      </td>
                      <td>
                        <input type="number" className="inp" style={{ width: "65px", padding: "2px 6px" }}
                          value={editDraft.qty} onChange={e => setEditDraft(d => ({ ...d, qty: e.target.value }))} />
                      </td>
                      <td>
                        <input className="inp" style={{ width: "60px", padding: "2px 6px" }} placeholder="unit"
                          value={editDraft.unit} onChange={e => setEditDraft(d => ({ ...d, unit: e.target.value }))} />
                      </td>
                      <td>
                        <input className="inp" style={{ width: "160px", padding: "2px 6px" }} placeholder="Spec"
                          value={editDraft.spec} onChange={e => setEditDraft(d => ({ ...d, spec: e.target.value }))} />
                      </td>
                      <td>
                        <input type="number" className="inp" style={{ width: "110px", padding: "2px 6px" }}
                          value={editDraft.unit_price} onChange={e => setEditDraft(d => ({ ...d, unit_price: e.target.value }))} />
                      </td>
                      <td className="total-cell">{fmtCur((Number(editDraft.qty) || 0) * (Number(editDraft.unit_price) || 0))}</td>
                      <td style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="edit-btn" style={{ background: "#16a34a" }} onClick={() => saveEdit(item.id)}>Save</button>
                        <button className="edit-btn" onClick={() => setEditingId(null)}>Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td><span className="cat-badge">{item.category}</span></td>
                      <td>{item.description}</td>
                      <td>{item.qty}</td>
                      <td>{item.unit}</td>
                      <td className="spec-cell">{item.spec}</td>
                      <td>{fmtCur(item.unit_price)}</td>
                      <td className="total-cell">{fmtCur(item.line_total)}</td>
                      <td style={{ display: "flex", gap: "0.25rem" }}>
                        {hasSizing ? (
                          <>
                            <button className="edit-btn" onClick={() => startEdit(item)}>Edit</button>
                            <button className="edit-btn" style={{ background: "#dc2626" }} onClick={() => deleteItem(item.id)}>Del</button>
                          </>
                        ) : isAdmin ? (
                          <>
                            <button className="edit-btn" onClick={() => startCatalogEdit(item._catalogRaw)}>Edit</button>
                            <button className="edit-btn" style={{ background: "#dc2626" }} onClick={() => deleteCatalogItem(item.id)}>Del</button>
                          </>
                        ) : null}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td colSpan={7}>TOTAL BOM EQUIPMENT COST</td>
                <td>{fmtCur(totalBom)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Admin: Manage Catalog (always visible to admin) */}
      {isAdmin && hasSizing && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="card-title" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Manage Component Catalog</span>
            <button className="load-btn" onClick={() => { setShowCatalogForm(v => !v); if (showCatalogForm) resetCatalogDraft(); }}>
              {showCatalogForm ? "Close Form" : "Edit Catalog"}
            </button>
          </div>

          {showCatalogForm && (
            <div className="two-col" style={{ marginTop: "0.75rem", marginBottom: "1rem" }}>
              <input className="inp" placeholder="Category (e.g., Battery System)" value={catalogDraft.category} onChange={e => setCatalogDraft({ ...catalogDraft, category: e.target.value })} />
              <input className="inp" placeholder="Description" value={catalogDraft.description} onChange={e => setCatalogDraft({ ...catalogDraft, description: e.target.value })} />
              <input className="inp" type="number" placeholder="Qty" value={catalogDraft.qty} onChange={e => setCatalogDraft({ ...catalogDraft, qty: e.target.value })} />
              <input className="inp" placeholder="Unit (e.g., pcs)" value={catalogDraft.unit} onChange={e => setCatalogDraft({ ...catalogDraft, unit: e.target.value })} />
              <input className="inp" placeholder="Specification" value={catalogDraft.spec} onChange={e => setCatalogDraft({ ...catalogDraft, spec: e.target.value })} />
              <input className="inp" type="number" placeholder="Unit Price (₹)" value={catalogDraft.unit_price} onChange={e => setCatalogDraft({ ...catalogDraft, unit_price: e.target.value })} />
              <div className="calc-btn-row" style={{ justifyContent: "flex-start", gridColumn: "1 / -1" }}>
                <button className="calc-btn" onClick={saveCatalogItem}>{catalogEditId !== null ? "Update Item" : "Save Item"}</button>
                {catalogEditId !== null && <button className="btn-secondary" onClick={resetCatalogDraft}>Cancel</button>}
              </div>
            </div>
          )}
        </div>
      )}
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
      const res = await fetch(`${API_BASE}/api/admin/panel`, {
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
    const res = await fetch(`${API_BASE}/api/admin/panel`, {
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

  // Allow both user and admin to access admin page
  // if (auth?.user?.role !== "admin") {
  //   return (
  //     <div className="auth-shell">
  //       <div className="auth-card">
  //         <h2>Access Denied</h2>
  //         <p>Only admin users can access /bess-app-admin.</p>
  //         <div className="calc-btn-row" style={{ justifyContent: "flex-start" }}>
  //           <button className="btn-secondary" onClick={goHome}>Return to Home</button>
  //         </div>
  //         <button className="calc-btn" onClick={onLogout}>Logout</button>
  //       </div>
  //     </div>
  //   );
  // }

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
      <div className="empty-icon"></div>
      <div className="empty-text">{message || "Run an optimisation to see results"}</div>
      <div className="empty-sub">Set your inputs in the Project Wizard tab and click "Run Optimisation"</div>
    </div>
  );
}

// ── Tab: Admin Panel (admin-only) ─────────────────────────────────────────────
function AdminPanelTab({ authHeaders, onUnauthorized }) {
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const flash = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/panel`, { headers: authHeaders() });
      if (res.status === 401) { onUnauthorized?.(); return; }
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setAdmins(data.admins || []);
      setUsers(data.users || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const createAdmin = async (e) => {
    e.preventDefault();
    setError("");
    const res = await fetch(`${API_BASE}/api/admin/panel`, {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.detail || "Failed to create admin"); return; }
    setEmail(""); setPassword("");
    await loadUsers();
    flash("Admin account created.");
  };

  const toggleActive = async (userId, isActive) => {
    const res = await fetch(`${API_BASE}/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !isActive }),
    });
    if (!res.ok) { setError("Failed to update user"); return; }
    await loadUsers();
    flash(isActive ? "User deactivated." : "User activated.");
  };

  return (
    <div className="tab-content">
      {error && <div className="error-bar">{error}</div>}
      {successMsg && <div className="success-bar">{successMsg}</div>}

      <div className="kpi-row">
        <KPICard label="Admin Accounts" value={admins.length} accent="amber" />
        <KPICard label="User Accounts" value={users.length} accent="blue" />
        <KPICard label="Total" value={admins.length + users.length} accent="green" />
      </div>

      {/* Create admin form */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title">Create Admin Account</div>
        <form onSubmit={createAdmin}>
          <div className="two-col">
            <div>
              <label className="input-label">Email</label>
              <input className="inp" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="admin@elektronre.com" />
            </div>
            <div>
              <label className="input-label">Password</label>
              <input className="inp" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          </div>
          <div className="calc-btn-row" style={{ justifyContent: "flex-start", marginTop: "0.75rem" }}>
            <button className="calc-btn" type="submit">Create Admin</button>
          </div>
        </form>
      </div>

      {/* Admin accounts */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title">Admin Accounts</div>
        {loading ? <div className="loading-msg">Loading…</div> : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Email</th><th>Username</th><th>Created</th></tr></thead>
              <tbody>
                {admins.map(a => (
                  <tr key={a.id}>
                    <td>#{a.id}</td>
                    <td>{a.email}</td>
                    <td>{a.username || "—"}</td>
                    <td>{a.created_at ? new Date(a.created_at).toLocaleDateString("en-IN") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User accounts */}
      <div className="card">
        <div className="card-title">User Accounts</div>
        {loading ? <div className="loading-msg">Loading…</div> : users.length === 0 ? (
          <div className="empty-msg">No user accounts yet.</div>
        ) : (
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr><th>ID</th><th>Email</th><th>Username</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>#{u.id}</td>
                    <td>{u.email}</td>
                    <td>{u.username || "—"}</td>
                    <td><span className={u.is_active ? "pos" : ""} style={{ fontWeight: 600 }}>{u.is_active ? "Active" : "Inactive"}</span></td>
                    <td>
                      <button className="edit-btn"
                        style={{ background: u.is_active ? "#dc2626" : "#16a34a" }}
                        onClick={() => toggleActive(u.id, u.is_active)}>
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
  const [theme, setTheme] = useState(() => localStorage.getItem("bess-theme") || "dark");
  const { user, isAuthenticated, logout } = useAuthStore();

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === "dark" ? "light" : "dark";
      localStorage.setItem("bess-theme", next);
      return next;
    });
  }, []);
  const navigate = useNavigate();

  const authHeaders = useCallback(() => {
    if (!user?.token) return {};
    return { Authorization: `Bearer ${user.token}` };
  }, [user]);

  const isAdmin = user?.is_admin || user?.role === "admin";
  const tabs = isAdmin ? ADMIN_TABS : USER_TABS;

  const handleUnauthorized = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const handleCalculate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/calculate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(inputs),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) throw new Error(`Calculation failed: ${res.status}`);
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

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const isBessAppAdminRoute = typeof window !== "undefined" && window.location.pathname === "/bess-app-admin";

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) {
    return null;
  }

  if (isBessAppAdminRoute) {
    return <BessAppAdminPage auth={user} authHeaders={authHeaders} onLogout={handleLogout} />;
  }

  return (
    <div className={`bess-app ${theme}`}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/assets/elektron-logo.png" alt="Elektron" className="sidebar-logo" />
          <div style={{ flex: 1 }}>
            <div className="sidebar-title">BESS Optimality</div>
            <div className="sidebar-sub">Elektron RE</div>
          </div>
          <button className="sidebar-theme-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {tabs.map(t => (
            <button
              key={t}
              className={`sidebar-item ${activeTab === t ? "active" : ""}`}
              onClick={() => setActiveTab(t)}
            >
              <span className="sidebar-label">{t}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {result && (
            <div className="sidebar-kpis">
              {calcId && <div className="sidebar-calc-badge">Calc #{calcId}</div>}
              <div className="sidebar-kpi-row">
                <span className="sidebar-kpi-label">Installed</span>
                <span className="sidebar-kpi-val">{result.sizing?.actual_installed_kwh} kWh</span>
              </div>
              <div className="sidebar-kpi-row">
                <span className="sidebar-kpi-label">LCOS</span>
                <span className="sidebar-kpi-val">₹{fmt(result.lcos?.lcos_inr_per_kwh, 2)}/kWh</span>
              </div>
              <div className="sidebar-kpi-row">
                <span className="sidebar-kpi-label">Payback</span>
                <span className="sidebar-kpi-val">{result.roi?.simple_payback_yrs} yrs</span>
              </div>
            </div>
          )}
          <div className="sidebar-user">
            <span className={`role-badge ${isAdmin ? "role-badge-admin" : "role-badge-user"}`}>
              {isAdmin ? "Admin" : "User"}
            </span>
            <span className="sidebar-email">{user?.email}</span>
            <button className="sidebar-logout-btn" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="app-content">
        {error && (
          <div className="error-bar" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem", borderRadius: 0, margin: 0 }}>
            <span>{error} — Check API connection (FastAPI at port 8000)</span>
            <button className="btn-secondary" onClick={() => setActiveTab("Project Wizard")}>Return to Home</button>
          </div>
        )}

        <main className="app-main">
          {activeTab === "Project Wizard" && (
            <ProjectWizard
              authToken={user?.token}
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
          {activeTab === "Supplier Engine" && <SupplierEngineTab isAdmin={isAdmin} authHeaders={authHeaders} onUnauthorized={handleUnauthorized} />}
          {activeTab === "BOM Viewer" && <BOMTab isAdmin={isAdmin} authHeaders={authHeaders} result={result} />}
          {activeTab === "Analytics" && <AnalyticsTab data={result} />}
          {activeTab === "History" && <HistoryTab onLoad={handleLoadHistory} onEdit={handleEditHistory} authHeaders={authHeaders} onUnauthorized={handleUnauthorized} />}
          {activeTab === "Admin Panel" && isAdmin && <AdminPanelTab authHeaders={authHeaders} onUnauthorized={handleUnauthorized} />}
        </main>

        <footer className="app-footer">
          Elektron RE · BESS Optimality v2.0 · FastAPI + PostgreSQL + React · Permutation Engine + Supplier Scoring
        </footer>
      </div>
    </div>
  );
}
