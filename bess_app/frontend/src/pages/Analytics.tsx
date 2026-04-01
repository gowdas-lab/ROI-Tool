import type { CalculationResult } from '../types';

interface AnalyticsProps {
  data: CalculationResult | null;
}

export function Analytics({ data }: AnalyticsProps) {
  if (!data) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-text">Run a calculation to see analytics</div>
      </div>
    );
  }

  const { capex, opex, lcos, savings, roi, cashflow_years } = data;
  const breakeven = cashflow_years?.find((y) => y.cumulative_net >= 0);

  const fmt = (n: number, d = 0) => n?.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }) || '—';
  const fmtCur = (n: number) => `₹${fmt(n)}`;
  const fmtLakh = (n: number) => `₹${fmt(n / 100000, 2)}L`;

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KpiCard label="CAPEX" value={fmtLakh(capex.total_capex)} sub="Total investment" accent="red" />
        <KpiCard label="LCOS" value={`₹${fmt(lcos.lcos_inr_per_kwh, 2)}/kWh`} sub="Levelised cost" accent="green" />
        <KpiCard label="Payback" value={`${roi.simple_payback_yrs} yrs`} sub={getPaybackLabel(roi.simple_payback_yrs)} accent={getPaybackAccent(roi.simple_payback_yrs)} />
        <KpiCard label="10-Yr ROI" value={`${fmt(roi.roi_10yr_pct, 1)}%`} sub="Return on investment" accent="blue" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Savings Breakdown (Annual)</div>
          <MiniBar label="Arbitrage" value={savings.annual_arbitrage} max={savings.total_annual_savings} color="var(--green)" />
          <MiniBar label="MD Saving" value={savings.annual_md_saving} max={savings.total_annual_savings} color="var(--accent)" />
          <MiniBar label="DG Displacement" value={savings.dg_displacement} max={savings.total_annual_savings} color="var(--teal)" />
          <div className="total-row">
            <span>Total Annual Savings</span>
            <span className="total-val">{fmtCur(savings.total_annual_savings)}</span>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Cash Flow Summary</div>
          <table className="data-table">
            <tbody>
              <tr><td>Net Annual Benefit</td><td>{fmtCur(roi.net_annual_benefit)}</td></tr>
              <tr><td>Breakeven Year</td><td>{breakeven ? `Year ${breakeven.year}` : 'Post-10yr'}</td></tr>
              <tr><td>10-Yr Cumulative</td><td>{fmtCur(roi.cumulative_10yr_net)}</td></tr>
              <tr><td>NPV (8%)</td><td>{fmtCur(roi.npv_8pct)}</td></tr>
              <tr className="row-total"><td>Energy Throughput</td><td>{fmt(lcos.energy_throughput_kwh)} kWh</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className={`kpi ${accent}`}>
      <span className="kpi-val">{value}</span>
      <span className="kpi-label">{label}</span>
      <span className="kpi-sub">{sub}</span>
    </div>
  );
}

function MiniBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const fmt = (n: number) => `₹${n?.toLocaleString('en-IN') || 0}`;

  return (
    <div className="mini-bar">
      <div className="mini-bar-label">{label}</div>
      <div className="mini-bar-track">
        <div className="mini-bar-fill" style={{ width: `${pct}%`, background: color }} />
        <span className="mini-bar-text">{fmt(value)}</span>
      </div>
    </div>
  );
}

function getPaybackLabel(years: number): string {
  if (years < 4) return '🟢 Excellent';
  if (years < 6) return '🟡 Good';
  return '🔴 Review';
}

function getPaybackAccent(years: number): string {
  if (years < 4) return 'green';
  if (years < 6) return 'amber';
  return 'red';
}
