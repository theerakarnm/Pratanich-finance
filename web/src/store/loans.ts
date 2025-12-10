import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  getLoans,
  deleteLoan,
  createLoan,
  updateLoan,
  type Loan
} from '@/lib/api-client';

interface LoansState {
  // API Data
  loans: Loan[];
  totalPages: number;
  total: number;

  // UI State
  searchTerm: string;
  currentPage: number;
  itemsPerPage: number;
  showDeleteDialog: boolean;
  loanToDelete: Loan | null;

  // Loading & Error State
  isLoading: boolean;
  error: string | null;

  // Actions
  setSearchTerm: (term: string) => void;
  setCurrentPage: (page: number) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setLoanToDelete: (loan: Loan | null) => void;
  fetchLoans: () => Promise<void>;
  deleteLoanById: (id: string) => Promise<void>;
  resetFilters: () => void;

  // CRUD Actions
  createLoan: (data: any) => Promise<Loan>;
  updateLoan: (id: string, data: Partial<Loan>) => Promise<Loan>;
}

export const useLoansStore = create<LoansState>()(
  persist(
    (set, get) => ({
      // API Data
      loans: [],
      totalPages: 1,
      total: 0,

      // UI State
      searchTerm: '',
      currentPage: 1,
      itemsPerPage: 10,
      showDeleteDialog: false,
      loanToDelete: null,

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

      setShowDeleteDialog: (show) => {
        set({ showDeleteDialog: show });
      },

      setLoanToDelete: (loan) => {
        set({ loanToDelete: loan });
      },

      fetchLoans: async () => {
        const { currentPage, itemsPerPage, searchTerm } = get();
        set({ isLoading: true, error: null });

        try {
          const response = await getLoans({
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm || undefined,
          });

          set({
            loans: response.data,
            totalPages: response.meta.totalPages,
            total: response.meta.total,
            isLoading: false,
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลเงินกู้ได้',
            loans: [],
            isLoading: false,
          });
        }
      },

      deleteLoanById: async (id) => {
        set({ isLoading: true, error: null });

        try {
          await deleteLoan(id);
          set({ showDeleteDialog: false, loanToDelete: null });
          // Refresh the list after deletion
          await get().fetchLoans();
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'ไม่สามารถลบสัญญาเงินกู้ได้',
            showDeleteDialog: false,
            isLoading: false,
          });
        }
      },

      createLoan: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const newLoan = await createLoan(data);
          set({ isLoading: false });
          return newLoan;
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'ไม่สามารถสร้างสัญญาเงินกู้ได้'
          });
          throw err;
        }
      },

      updateLoan: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updated = await updateLoan(id, data);
          set({ isLoading: false });
          return updated;
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'ไม่สามารถแก้ไขสัญญาเงินกู้ได้'
          });
          throw err;
        }
      },

      resetFilters: () => {
        set({
          searchTerm: '',
          currentPage: 1,
          showDeleteDialog: false,
          loanToDelete: null,
        });
      },
    }),
    {
      name: 'loans-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        searchTerm: state.searchTerm,
        currentPage: state.currentPage,
        itemsPerPage: state.itemsPerPage,
      }),
    }
  )
);
