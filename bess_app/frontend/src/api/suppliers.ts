import type { Supplier, ScoringWeights } from "../types";
import { fetchWithAuth } from "./client";

export async function fetchSuppliers(): Promise<Supplier[]> {
  const res = await fetchWithAuth(`/api/suppliers`);
  if (!res.ok) throw new Error("Failed to fetch suppliers");
  return res.json();
}

export async function addSupplier(data: Partial<Supplier>) {
  const res = await fetchWithAuth(`/api/suppliers`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add supplier");
  return res.json();
}

export async function scoreSupplier(supplierId: number, scores: Record<string, number>, weights: ScoringWeights) {
  const res = await fetchWithAuth(`/api/suppliers/${supplierId}/score`, {
    method: "POST",
    body: JSON.stringify({ ...scores, weights }),
  });
  if (!res.ok) throw new Error("Failed to score supplier");
  return res.json();
}

export async function fetchScoringWeights(): Promise<{ weights: ScoringWeights }> {
  const res = await fetchWithAuth(`/api/scoring-weights`);
  if (!res.ok) throw new Error("Failed to fetch scoring weights");
  return res.json();
}

export async function saveScoringWeights(weights: ScoringWeights) {
  const res = await fetchWithAuth(`/api/scoring-weights`, {
    method: "POST",
    body: JSON.stringify({ weights }),
  });
  if (!res.ok) throw new Error("Failed to save scoring weights");
  return res.json();
}
