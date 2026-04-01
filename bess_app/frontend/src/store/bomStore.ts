import { create } from 'zustand';
import type { BomItem, BomSummary } from '../types';

interface BomState {
  items: BomItem[];
  summary: BomSummary | null;
  selectedCategory: string;
  setItems: (items: BomItem[]) => void;
  setSummary: (summary: BomSummary) => void;
  setSelectedCategory: (category: string) => void;
  getCategories: () => string[];
}

export const useBomStore = create<BomState>((set, get) => ({
  items: [],
  summary: null,
  selectedCategory: "All",
  setItems: (items) => set({ items }),
  setSummary: (summary) => set({ summary }),
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  getCategories: () => {
    const { items } = get();
    return [...new Set(items.map((i) => i.category))];
  },
}));
