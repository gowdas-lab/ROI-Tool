import type { CalculationResult } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function runCalculation(inputs: any): Promise<CalculationResult> {
  const res = await fetch(`${API_BASE}/api/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs),
  });
  if (!res.ok) throw new Error(`Calculation failed: ${res.status}`);
  return res.json();
}

export async function fetchCalculations() {
  const res = await fetch(`${API_BASE}/api/calculations`);
  if (!res.ok) throw new Error("Failed to fetch calculations");
  return res.json();
}

export async function fetchCalculation(id: number): Promise<CalculationResult> {
  const res = await fetch(`${API_BASE}/api/calculations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch calculation");
  return res.json();
}
