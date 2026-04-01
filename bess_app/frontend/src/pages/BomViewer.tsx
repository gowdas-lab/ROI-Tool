import { useEffect, useState } from 'react';
import { useBomStore } from '../store';
import { fetchBom } from '../api/bom';

interface BomViewerProps {
  projectId: number;
}

export function BomViewer({ projectId }: BomViewerProps) {
  const { items, summary, selectedCategory, setItems, setSummary, setSelectedCategory, getCategories } = useBomStore();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    fetchBom(projectId)
      .then((data) => {
        setItems(data.items);
        setSummary(data.summary);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  if (loading) return <div className="loading-msg">Loading BOM...</div>;
  if (!projectId) return <EmptyState message="Select a project to view BOM" />;

  const categories = getCategories();
  const filtered = selectedCategory === "All" ? items : items.filter((i) => i.category === selectedCategory);

  const fmtCur = (n: number) => `₹${n?.toLocaleString('en-IN') || 0}`;

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KpiCard label="Total BOM" value={fmtCur(summary?.total_bom || 0)} accent="red" />
        <KpiCard label="Line Items" value={items.length} accent="blue" />
        <KpiCard label="Categories" value={categories.length} accent="green" />
      </div>

      <div className="card">
        <div className="bom-filter-row">
          {["All", ...categories].map((c) => (
            <button key={c} className={`filter-btn ${selectedCategory === c ? "active" : ""}`} onClick={() => setSelectedCategory(c)}>
              {c}
            </button>
          ))}
        </div>

        <div className="table-scroll">
          <table className="data-table bom-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><span className="cat-badge">{item.category}</span></td>
                  <td>{item.description}</td>
                  <td>{item.qty}</td>
                  <td>{item.unit}</td>
                  <td>{fmtCur(item.unit_price)}</td>
                  <td className="total-cell">{fmtCur(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="row-total">
                <td colSpan={5}>TOTAL</td>
                <td>{fmtCur(summary?.total_bom || 0)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className={`kpi ${accent}`}>
      <span className="kpi-val">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">📋</div>
      <div className="empty-text">{message}</div>
    </div>
  );
}
