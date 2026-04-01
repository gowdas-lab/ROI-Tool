import { useEffect, useState } from 'react';
import { fetchSuppliers, scoreSupplier, fetchScoringWeights, saveScoringWeights } from '../api/suppliers';
import type { Supplier, ScoringWeights } from '../types';

export function SupplierEngine() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [weights, setWeights] = useState<ScoringWeights>({ price: 30, technical: 25, delivery: 15, warranty: 10, support: 10, cert: 10 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuppliers();
    loadWeights();
  }, []);

  const loadSuppliers = async () => {
    const data = await fetchSuppliers();
    setSuppliers(data);
  };

  const loadWeights = async () => {
    const data = await fetchScoringWeights();
    setWeights(data.weights);
  };

  const handleWeightChange = (key: keyof ScoringWeights, value: number) => {
    setWeights((w) => ({ ...w, [key]: value }));
  };

  const saveWeights = async () => {
    await saveScoringWeights(weights);
  };

  const handleScore = async (supplierId: number, scores: Record<string, number>) => {
    await scoreSupplier(supplierId, scores, weights);
    loadSuppliers();
  };

  return (
    <div className="tab-content">
      <div className="kpi-row">
        <KpiCard label="Suppliers" value={suppliers.length} accent="blue" />
        <KpiCard label="Tier 1" value={suppliers.filter((s) => s.tier === 'Tier 1').length} accent="green" />
        <KpiCard label="Scored" value={suppliers.filter((s) => s.weighted_score).length} accent="amber" />
      </div>

      <div className="two-col">
        <div className="card">
          <div className="card-title">Scoring Weights</div>
          {Object.entries(weights).map(([key, val]) => (
            <div key={key} className="input-row">
              <label className="input-label">{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                type="number"
                value={val}
                onChange={(e) => handleWeightChange(key as keyof ScoringWeights, parseInt(e.target.value))}
                className="inp"
                min="0"
                max="100"
              />
              <span className="input-unit">%</span>
            </div>
          ))}
          <button className="calc-btn" onClick={saveWeights} style={{ marginTop: '1rem' }}>
            Save Weights
          </button>
        </div>

        <div className="card">
          <div className="card-title">Supplier Rankings</div>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Supplier</th>
                  <th>Category</th>
                  <th>Tier</th>
                  <th>Weighted</th>
                </tr>
              </thead>
              <tbody>
                {suppliers
                  .sort((a, b) => (b.weighted_score || 0) - (a.weighted_score || 0))
                  .map((s) => (
                    <tr key={s.id}>
                      <td>{s.name}</td>
                      <td><span className="cat-badge">{s.component_category}</span></td>
                      <td>{s.tier}</td>
                      <td className={s.weighted_score && s.weighted_score > 70 ? 'pos' : ''}>
                        {s.weighted_score?.toFixed(1) || '-'}
                      </td>
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

function KpiCard({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className={`kpi ${accent}`}>
      <span className="kpi-val">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}
