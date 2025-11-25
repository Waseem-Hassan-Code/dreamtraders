import { create } from 'zustand';
import { Invoice } from '@/types';
import { invoiceRepository } from '@/database/repositories';

interface InvoiceState {
  invoices: Invoice[];
  currentInvoice: Invoice | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadInvoices: () => Promise<void>;
  loadInvoiceById: (id: string) => Promise<void>;
  loadInvoicesByClient: (clientId: string) => Promise<void>;
  loadInvoicesByDateRange: (startDate: Date, endDate: Date) => Promise<void>;
  loadInvoicesByStatus: (status: Invoice['status']) => Promise<void>;
  createInvoice: (
    data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Invoice>;
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<void>;
  deleteInvoice: (id: string) => Promise<void>;
  generateInvoiceNumber: () => Promise<string>;
  setCurrentInvoice: (invoice: Invoice | null) => void;

  clearError: () => void;
  reset: () => void;
}

export const useInvoiceStore = create<InvoiceState>((set, get) => ({
  invoices: [],
  currentInvoice: null,
  isLoading: false,
  error: null,

  loadInvoices: async () => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await invoiceRepository.getAll();
      set({ invoices, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadInvoiceById: async id => {
    set({ isLoading: true, error: null });
    try {
      const invoice = await invoiceRepository.getById(id);
      set({ currentInvoice: invoice, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadInvoicesByClient: async clientId => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await invoiceRepository.getByClientId(clientId);
      set({ invoices, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadInvoicesByDateRange: async (startDate, endDate) => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await invoiceRepository.getByDateRange(
        startDate,
        endDate,
      );
      set({ invoices, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadInvoicesByStatus: async status => {
    set({ isLoading: true, error: null });
    try {
      const invoices = await invoiceRepository.getByStatus(status);
      set({ invoices, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createInvoice: async data => {
    set({ isLoading: true, error: null });
    try {
      const invoice = await invoiceRepository.create(data);
      const { invoices } = get();
      set({
        invoices: [invoice, ...invoices],
        isLoading: false,
      });
      return invoice;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateInvoice: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await invoiceRepository.update(id, data);
      const { invoices } = get();
      set({
        invoices: invoices.map(inv =>
          inv.id === id ? { ...inv, ...data } : inv,
        ),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteInvoice: async id => {
    set({ isLoading: true, error: null });
    try {
      await invoiceRepository.delete(id);
      const { invoices } = get();
      set({
        invoices: invoices.filter(inv => inv.id !== id),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  generateInvoiceNumber: async () => {
    try {
      return await invoiceRepository.generateInvoiceNumber();
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  setCurrentInvoice: invoice => {
    set({ currentInvoice: invoice });
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      invoices: [],
      currentInvoice: null,
      isLoading: false,
      error: null,
    }),
}));
