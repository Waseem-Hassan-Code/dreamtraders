import { create } from 'zustand';
import { CategorySettings } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CategoryStore {
  categories: CategorySettings[];
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  createCategory: (
    category: Omit<
      CategorySettings,
      'id' | 'createdAt' | 'updatedAt' | 'order'
    >,
  ) => Promise<void>;
  updateCategory: (
    id: string,
    updates: Partial<CategorySettings>,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reorderCategories: (categoryIds: string[]) => Promise<void>;
  toggleCategoryEnabled: (id: string) => Promise<void>;
}

const STORAGE_KEY = '@dreamtraders_categories';

// Default categories
const DEFAULT_CATEGORIES: CategorySettings[] = [
  {
    id: 'detergents',
    name: 'Detergents',
    icon: 'spray-bottle',
    color: '#0ea5e9',
    hasWeight: true,
    order: 0,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'soaps',
    name: 'Soaps',
    icon: 'soap',
    color: '#10b981',
    hasWeight: true,
    order: 1,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'liquid_soaps',
    name: 'Liquid Soaps',
    icon: 'bottle-tonic',
    color: '#14b8a6',
    hasWeight: true,
    order: 2,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'beverages',
    name: 'Beverages',
    icon: 'cup-water',
    color: '#f59e0b',
    hasWeight: true,
    order: 3,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'snacks',
    name: 'Snacks',
    icon: 'food-croissant',
    color: '#ef4444',
    hasWeight: true,
    order: 4,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'personal_care',
    name: 'Personal Care',
    icon: 'spray',
    color: '#8b5cf6',
    hasWeight: false,
    order: 5,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'household',
    name: 'Household',
    icon: 'home-variant',
    color: '#ec4899',
    hasWeight: false,
    order: 6,
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const categories = JSON.parse(stored);
        // Parse dates
        const parsedCategories = categories.map((cat: any) => ({
          ...cat,
          createdAt: new Date(cat.createdAt),
          updatedAt: new Date(cat.updatedAt),
        }));
        set({ categories: parsedCategories });
      } else {
        // Initialize with defaults
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify(DEFAULT_CATEGORIES),
        );
        set({ categories: DEFAULT_CATEGORIES });
      }
    } catch (error) {
      console.error('Failed to load categories:', error);
      set({ categories: DEFAULT_CATEGORIES });
    } finally {
      set({ isLoading: false });
    }
  },

  createCategory: async categoryData => {
    const { categories } = get();
    const newCategory: CategorySettings = {
      ...categoryData,
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      order: categories.length,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updated = [...categories, newCategory];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ categories: updated });
  },

  updateCategory: async (id, updates) => {
    const { categories } = get();
    const updated = categories.map(cat =>
      cat.id === id ? { ...cat, ...updates, updatedAt: new Date() } : cat,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ categories: updated });
  },

  deleteCategory: async id => {
    const { categories } = get();
    const updated = categories.filter(cat => cat.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ categories: updated });
  },

  reorderCategories: async categoryIds => {
    const { categories } = get();
    const reordered = categoryIds
      .map((id, index) => {
        const cat = categories.find(c => c.id === id);
        return cat ? { ...cat, order: index, updatedAt: new Date() } : null;
      })
      .filter(Boolean) as CategorySettings[];

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reordered));
    set({ categories: reordered });
  },

  toggleCategoryEnabled: async id => {
    const { categories } = get();
    const updated = categories.map(cat =>
      cat.id === id
        ? { ...cat, enabled: !cat.enabled, updatedAt: new Date() }
        : cat,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    set({ categories: updated });
  },
}));
