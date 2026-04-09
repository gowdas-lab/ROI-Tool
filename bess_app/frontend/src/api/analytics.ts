import type { CalculationResult } from "../types";
import { fetchWithAuth } from "./client";

export async function runCalculation(inputs: any): Promise<CalculationResult> {
  const res = await fetchWithAuth(`/api/calculate`, {
    method: "POST",
    body: JSON.stringify(inputs),
  });
  if (!res.ok) throw new Error(`Calculation failed: ${res.status}`);
  return res.json();
}

export async function fetchCalculations() {
  const res = await fetchWithAuth(`/api/calculations`);
  if (!res.ok) throw new Error("Failed to fetch calculations");
  return res.json();
}

export async function fetchCalculation(id: number): Promise<CalculationResult> {
  const res = await fetchWithAuth(`/api/calculations/${id}`);
  if (!res.ok) throw new Error("Failed to fetch calculation");
  return res.json();
}
