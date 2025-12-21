import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getClients,
  deleteClient,
  createClient,
  updateClient,
  type Client
} from '@/lib/api-client';

interface ClientsState {
  // API Data
  clients: Client[];
  totalPages: number;
  total: number;

  // UI State
  searchTerm: string;
  connectionFilter: 'all' | 'connected' | 'not-connected';
  currentPage: number;
  itemsPerPage: number;
  showDeleteDialog: boolean;
  clientToDelete: Client | null;

  // Loading & Error State
  isLoading: boolean;
  error: string | null;

  // Actions
  setSearchTerm: (term: string) => void;
  setConnectionFilter: (filter: 'all' | 'connected' | 'not-connected') => void;
  setCurrentPage: (page: number) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setClientToDelete: (client: Client | null) => void;
  fetchClients: () => Promise<void>;
  deleteClientById: (id: string) => Promise<void>;
  resetFilters: () => void;

  // CRUD Actions
  createClient: (data: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>) => Promise<Client>;
  updateClient: (id: string, data: Partial<Client>) => Promise<Client>;
}

export const useClientsStore = create<ClientsState>()(
  persist(
    (set, get) => ({
      // API Data
      clients: [],
      totalPages: 1,
      total: 0,

      // UI State
      searchTerm: '',
      connectionFilter: 'all',
      currentPage: 1,
      itemsPerPage: 10,
      showDeleteDialog: false,
      clientToDelete: null,

      // Loading & Error State
      isLoading: false,
      error: null,

      // Actions
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
      },

      setConnectionFilter: (filter) => {
        set({ connectionFilter: filter });
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
      },

      setShowDeleteDialog: (show) => {
        set({ showDeleteDialog: show });
      },

      setClientToDelete: (client) => {
        set({ clientToDelete: client });
      },

      fetchClients: async () => {
        const { currentPage, itemsPerPage, searchTerm } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await getClients({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm || undefined,
          });

          set({
            clients: response.data,
            totalPages: response.meta.totalPages,
            total: response.meta.total,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลลูกค้าได้',
            clients: [],
            isLoading: false,
          });
        }
      },

      deleteClientById: async (id) => {
        set({ isLoading: true, error: null });

        try {
          await deleteClient(id);
          set({ showDeleteDialog: false, clientToDelete: null });
          // Refresh the list after deletion
          await get().fetchClients();
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'ไม่สามารถลบลูกค้าได้',
            showDeleteDialog: false,
            isLoading: false,
          });
        }
      },

      createClient: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const newClient = await createClient(data);
          set({ isLoading: false });
          // Optionally refetch to include new client if it matches current filter
          // await get().fetchClients();
          return newClient;
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'ไม่สามารถสร้างลูกค้าได้'
          });
          throw err;
        }
      },

      updateClient: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await updateClient(id, data);
          set({ isLoading: false });
          // No need to fetch here if we assume the user navigates back and list auto-refetches
          // but if we stay on page, we might want to update local state if we were caching 'currentClient'.
          // Since we don't cache 'currentClient' (Edit page fetches it), we are good.
          return updated;
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'ไม่สามารถอัพเดทข้อมูลลูกค้าได้'
          });
          throw err;
        }
      },

      resetFilters: () => {
        set({
          searchTerm: '',
          connectionFilter: 'all',
          currentPage: 1,
          showDeleteDialog: false,
          clientToDelete: null,
        });
      },
    }),
    {
      name: 'clients-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchTerm: state.searchTerm,
        connectionFilter: state.connectionFilter,
        currentPage: state.currentPage,
        itemsPerPage: state.itemsPerPage,
      }),
    }
  )
);
