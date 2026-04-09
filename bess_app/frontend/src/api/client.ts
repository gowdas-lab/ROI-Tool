import { useAuthStore } from '../store/authStore';

export function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = useAuthStore.getState().user?.token;
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}
