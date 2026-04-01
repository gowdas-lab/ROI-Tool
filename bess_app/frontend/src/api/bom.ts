import type { BomItem, BomSummary } from "../types";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchBom(calculationId: number): Promise<{ items: BomItem[]; summary: BomSummary }> {
  const res = await fetch(`${API_BASE}/api/calculations/${calculationId}/bom`);
  if (!res.ok) throw new Error("Failed to fetch BOM");
  return res.json();
}

export async function generateBom(projectId: number, configurationId: number) {
  const res = await fetch(`${API_BASE}/api/bom/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ project_id: projectId, configuration_id: configurationId }),
  });
  if (!res.ok) throw new Error("Failed to generate BOM");
  return res.json();
}
