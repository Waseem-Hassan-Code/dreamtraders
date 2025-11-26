import { create } from 'zustand';
import { Category, StockItem, LowStockAlert } from '@/types';
import { categoryRepository, stockRepository } from '@/database/repositories';

interface StockState {
  // Categories
  categories: Category[];
  currentCategory: Category | null;
  categoryPath: Category[];

  // Stock items
  stockItems: StockItem[];
  currentStockItem: StockItem | null;
  lowStockItems: LowStockAlert[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Category actions
  loadCategories: (parentId?: string) => Promise<void>;
  loadCategoryPath: (categoryId: string) => Promise<void>;
  createCategory: (
    data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Category>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  setCurrentCategory: (category: Category | null) => void;

  // Stock item actions
  loadStockItems: (categoryId: string) => Promise<void>;
  loadStockItemById: (id: string) => Promise<void>;
  createStockItem: (
    data: Omit<StockItem, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<StockItem>;
  updateStockItem: (id: string, data: Partial<StockItem>) => Promise<void>;
  deleteStockItem: (id: string) => Promise<void>;
  updateStockQuantity: (
    id: string,
    quantity: number,
    type: 'IN' | 'OUT' | 'ADJUSTMENT',
    reason: string,
  ) => Promise<void>;
  loadLowStockItems: () => Promise<void>;
  setCurrentStockItem: (item: StockItem | null) => void;

  // Utility
  clearError: () => void;
  reset: () => void;
}

export const useStockStore = create<StockState>((set, get) => ({
  // Initial state
  categories: [],
  currentCategory: null,
  categoryPath: [],
  stockItems: [],
  currentStockItem: null,
  lowStockItems: [],
  isLoading: false,
  error: null,

  // Category actions
  loadCategories: async (parentId?: string) => {
    set({ isLoading: true, error: null });
    try {
      const categories = await categoryRepository.getByParentId(
        parentId || null,
      );
      set({ categories, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadCategoryPath: async (categoryId: string) => {
    try {
      const path = await categoryRepository.getFullPath(categoryId);
      set({ categoryPath: path });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  createCategory: async data => {
    set({ isLoading: true, error: null });
    try {
      const category = await categoryRepository.create(data);
      const { categories } = get();
      set({
        categories: [...categories, category],
        isLoading: false,
      });
      return category;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateCategory: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await categoryRepository.update(id, data);
      const { categories } = get();
      set({
        categories: categories.map(c => (c.id === id ? { ...c, ...data } : c)),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteCategory: async id => {
    set({ isLoading: true, error: null });
    try {
      await categoryRepository.delete(id);
      const { categories } = get();
      set({
        categories: categories.filter(c => c.id !== id),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentCategory: category => {
    set({ currentCategory: category });
  },

  // Stock item actions
  loadStockItems: async categoryId => {
    set({ isLoading: true, error: null });
    try {
      const items =
        categoryId === 'all' || !categoryId
          ? await stockRepository.getAll()
          : await stockRepository.getByCategoryId(categoryId);
      set({ stockItems: items, isLoading: false });
    } catch (error: any) {
      console.error('[StockStore] Error loading items:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  loadStockItemById: async id => {
    set({ isLoading: true, error: null });
    try {
      const item = await stockRepository.getById(id);
      set({ currentStockItem: item, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createStockItem: async data => {
    set({ isLoading: true, error: null });
    try {
      const item = await stockRepository.create(data);
      const { stockItems } = get();
      set({
        stockItems: [...stockItems, item],
        isLoading: false,
      });
      return item;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateStockItem: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await stockRepository.update(id, data);
      const { stockItems } = get();
      set({
        stockItems: stockItems.map(i => (i.id === id ? { ...i, ...data } : i)),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteStockItem: async id => {
    set({ isLoading: true, error: null });
    try {
      await stockRepository.delete(id);
      const { stockItems } = get();
      set({
        stockItems: stockItems.filter(i => i.id !== id),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateStockQuantity: async (id, quantity, type, reason) => {
    set({ isLoading: true, error: null });
    try {
      await stockRepository.updateQuantity(id, quantity, {
        stockItemId: id,
        type,
        quantity,
        reason,
        performedBy: 'system', // TODO: Add user management
      });
      await get().loadStockItemById(id);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loadLowStockItems: async () => {
    try {
      const items = await stockRepository.getLowStockItems();
      set({ lowStockItems: items });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  setCurrentStockItem: item => {
    set({ currentStockItem: item });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      categories: [],
      currentCategory: null,
      categoryPath: [],
      stockItems: [],
      currentStockItem: null,
      lowStockItems: [],
      isLoading: false,
      error: null,
    }),
}));
