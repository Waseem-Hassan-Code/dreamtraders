import { create } from 'zustand';
import { Client, LedgerEntry } from '@/types';
import { clientRepository } from '@/database/repositories';

interface ClientState {
  clients: Client[];
  currentClient: Client | null;
  ledgerEntries: LedgerEntry[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadClients: () => Promise<void>;
  loadClientById: (id: string) => Promise<void>;
  loadTopClients: (limit: number) => Promise<void>;
  createClient: (
    data: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  setCurrentClient: (client: Client | null) => void;

  // Ledger actions
  loadLedger: (
    clientId: string,
    startDate?: Date,
    endDate?: Date,
  ) => Promise<void>;
  addLedgerEntry: (
    clientId: string,
    entry: Omit<LedgerEntry, 'id' | 'clientId' | 'balance' | 'createdAt'>,
  ) => Promise<void>;

  clearError: () => void;
  reset: () => void;
}

export const useClientStore = create<ClientState>((set, get) => ({
  clients: [],
  currentClient: null,
  ledgerEntries: [],
  isLoading: false,
  error: null,

  loadClients: async () => {
    set({ isLoading: true, error: null });
    try {
      const clients = await clientRepository.getAll();
      set({ clients, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadClientById: async id => {
    set({ isLoading: true, error: null });
    try {
      const client = await clientRepository.getById(id);
      set({ currentClient: client, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  loadTopClients: async limit => {
    set({ isLoading: true, error: null });
    try {
      const clients = await clientRepository.getTopClients(limit);
      set({ clients, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createClient: async data => {
    set({ isLoading: true, error: null });
    try {
      const client = await clientRepository.create(data);
      const { clients } = get();
      set({
        clients: [...clients, client],
        isLoading: false,
      });
      return client;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updateClient: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      await clientRepository.update(id, data);
      const { clients } = get();
      set({
        clients: clients.map(c => (c.id === id ? { ...c, ...data } : c)),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deleteClient: async id => {
    set({ isLoading: true, error: null });
    try {
      await clientRepository.delete(id);
      const { clients } = get();
      set({
        clients: clients.filter(c => c.id !== id),
        isLoading: false,
      });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  setCurrentClient: client => {
    set({ currentClient: client });
  },

  loadLedger: async (clientId, startDate?, endDate?) => {
    set({ isLoading: true, error: null });
    try {
      const entries = await clientRepository.getLedger(
        clientId,
        startDate,
        endDate,
      );
      set({ ledgerEntries: entries, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  addLedgerEntry: async (clientId, entry) => {
    set({ isLoading: true, error: null });
    try {
      await clientRepository.addLedgerEntry(clientId, entry);
      // Reload client to update balance
      await get().loadClientById(clientId);
      // Reload ledger
      await get().loadLedger(clientId);
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  clearError: () => set({ error: null }),

  reset: () =>
    set({
      clients: [],
      currentClient: null,
      ledgerEntries: [],
      isLoading: false,
      error: null,
    }),
}));
