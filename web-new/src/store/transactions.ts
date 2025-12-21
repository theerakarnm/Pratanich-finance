import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getSlipOKLogs, type SlipOKLog } from '@/lib/api-client';

interface TransactionsState {
  // API Data
  transactions: SlipOKLog[];
  totalPages: number;
  total: number;

  // UI State
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  selectedTransaction: SlipOKLog | null;
  showVerifyModal: boolean;

  // Loading & Error State
  isLoading: boolean;
  error: string | null;

  // Actions
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  setSelectedTransaction: (transaction: SlipOKLog | null) => void;
  setShowVerifyModal: (show: boolean) => void;
  fetchTransactions: () => Promise<void>;
  resetFilters: () => void;
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set, get) => ({
      // API Data
      transactions: [],
      totalPages: 1,
      total: 0,

      // UI State
      searchTerm: '',
      currentPage: 1,
      itemsPerPage: 10,
      selectedTransaction: null,
      showVerifyModal: false,

      // Loading & Error State
      isLoading: false,
      error: null,

      // Actions
      setSearchTerm: (term) => {
        set({ searchTerm: term, currentPage: 1 });
      },

      setCurrentPage: (page) => {
        set({ currentPage: page });
      },

      setSelectedTransaction: (transaction) => {
        set({ selectedTransaction: transaction });
      },

      setShowVerifyModal: (show) => {
        set({ showVerifyModal: show });
      },

      fetchTransactions: async () => {
        const { currentPage, itemsPerPage, searchTerm } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await getSlipOKLogs({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm || undefined,
          });

          set({
            transactions: response.data,
            totalPages: response.meta.totalPages || 1,
            total: response.meta.total,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลรายการได้',
            transactions: [],
            isLoading: false,
          });
        }
      },

      resetFilters: () => {
        set({
          searchTerm: '',
          currentPage: 1,
          selectedTransaction: null,
          showVerifyModal: false,
        });
      },
    }),
    {
      name: 'transactions-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchTerm: state.searchTerm,
        currentPage: state.currentPage,
        itemsPerPage: state.itemsPerPage,
      }),
    }
  )
);
