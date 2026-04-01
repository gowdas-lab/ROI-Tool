const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

export async function fetchProjects() {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error("Failed to fetch projects");
  return res.json();
}

export async function fetchProject(id: number) {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  if (!res.ok) throw new Error("Failed to fetch project");
  return res.json();
}

export async function createProject(data: any) {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create project");
  return res.json();
}

export async function generateConfigurations(projectId: number) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/configurations`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to generate configurations");
  return res.json();
}

export async function fetchConfigurations(projectId: number) {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/configurations`);
  if (!res.ok) throw new Error("Failed to fetch configurations");
  return res.json();
}
