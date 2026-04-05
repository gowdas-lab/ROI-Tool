import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string | null;
  is_active: boolean;
  is_admin: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string, password: string) => Promise<boolean>;
  signup: (data: { email: string; username: string; password: string; full_name?: string }) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Login failed');
          }

          const data = await res.json();
          set({ 
            user: data.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      signup: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch(`${API_BASE}/api/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Signup failed');
          }

          const user = await res.json();
          set({ 
            user, 
            isAuthenticated: true, 
            isLoading: false 
          });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({ user: null, isAuthenticated: false, error: null });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'bess-auth',
    }
  )
);
