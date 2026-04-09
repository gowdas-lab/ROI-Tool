import type { BomItem, BomSummary } from "../types";
import { fetchWithAuth } from "./client";

export async function fetchBom(calculationId: number): Promise<{ items: BomItem[]; summary: BomSummary }> {
  const res = await fetchWithAuth(`/api/calculations/${calculationId}/bom`);
  if (!res.ok) throw new Error("Failed to fetch BOM");
  return res.json();
}

export async function generateBom(projectId: number, configurationId: number) {
  const res = await fetchWithAuth(`/api/bom/generate`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId, configuration_id: configurationId }),
  });
  if (!res.ok) throw new Error("Failed to generate BOM");
  return res.json();
}
