import type { Supplier, ScoringWeights } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetch(`${API_BASE}/api/suppliers`);
  if (!res.ok) throw new Error("Failed to fetch suppliers");
  return res.json();
}

export async function addSupplier(data: Partial<Supplier>) {
  const res = await fetch(`${API_BASE}/api/suppliers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add supplier");
  return res.json();
}

export async function scoreSupplier(supplierId: number, scores: Record<string, number>, weights: ScoringWeights) {
  const res = await fetch(`${API_BASE}/api/suppliers/${supplierId}/score`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...scores, weights }),
  });
  if (!res.ok) throw new Error("Failed to score supplier");
  return res.json();
}

export async function fetchScoringWeights(): Promise<{ weights: ScoringWeights }> {
  const res = await fetch(`${API_BASE}/api/scoring-weights`);
  if (!res.ok) throw new Error("Failed to fetch scoring weights");
  return res.json();
}

export async function saveScoringWeights(weights: ScoringWeights) {
  const res = await fetch(`${API_BASE}/api/scoring-weights`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weights }),
  });
  if (!res.ok) throw new Error("Failed to save scoring weights");
  return res.json();
}
