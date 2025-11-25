import { create } from 'zustand';
import { Expense, ExpenseCategory } from '@/types';
import { expenseRepository } from '@/database/repositories';

interface ExpenseState {
  expenses: Expense[];
  categories: ExpenseCategory[];
  isLoading: boolean;
  error: string | null;
  
  loadExpenses: (period?: { startDate: Date; endDate: Date }) => Promise<void>;
  loadCategories: () => Promise<void>;
  createExpense: (data: Omit<Expense, 'id' | 'createdAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  categories: [],
  isLoading: false,
  error: null,

  loadExpenses: async (period) => {
    set({ isLoading: true, error: null });
    try {
      let expenses;
      if (period) {
        expenses = await expenseRepository.getByDateRange(period.startDate, period.endDate);
      } else {
        expenses = await expenseRepository.getAll();
      }
      set({ expenses, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadCategories: async () => {
    try {
      const categories = await expenseRepository.getCategories();
      set({ categories });
    } catch (error: any) {
      console.error('Failed to load expense categories:', error);
    }
  },

  createExpense: async (data) => {
    set({ isLoading: true, error: null });
    try {
      await expenseRepository.create(data);
      // Reload expenses to update list
      await get().loadExpenses();
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteExpense: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await expenseRepository.delete(id);
      set(state => ({
        expenses: state.expenses.filter(e => e.id !== id),
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },
}));
