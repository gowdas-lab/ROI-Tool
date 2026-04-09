import { fetchWithAuth } from "./client";

export async function fetchProjects() {
  const res = await fetchWithAuth(`/api/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProject(id: number) {
  const res = await fetchWithAuth(`/api/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export async function createProject(data: any) {
  const res = await fetchWithAuth(`/api/projects`, {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function generateConfigurations(projectId: number) {
  const res = await fetchWithAuth(`/api/projects/${projectId}/configurations`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to generate configurations");
  return res.json();
}

export async function fetchConfigurations(projectId: number) {
  const res = await fetchWithAuth(`/api/projects/${projectId}/configurations`);
  if (!res.ok) throw new Error("Failed to fetch configurations");
  return res.json();
}
