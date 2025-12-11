import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getDashboardStats } from '@/lib/api-client';

interface DashboardState {
  // API Data
  totalClients: number;
  totalLoans: number;
  outstandingBalance: number;
  todayTransactions: number;

  // Chart Data
  loanTrends: Array<{ name: string; value: number }>;
  transactionVolume: Array<{ name: string; value: number }>;

  // Loading & Error State
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;

  // Actions
  fetchDashboardData: () => Promise<void>;
  setLoanTrends: (data: Array<{ name: string; value: number }>) => void;
  setTransactionVolume: (data: Array<{ name: string; value: number }>) => void;
}

// Default chart data (fallback if API returns empty)
const defaultLoanTrends: Array<{ name: string; value: number }> = [];
const defaultTransactionVolume: Array<{ name: string; value: number }> = [];

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // API Data
      totalClients: 0,
      totalLoans: 0,
      outstandingBalance: 0,
      todayTransactions: 0,

      // Chart Data
      loanTrends: defaultLoanTrends,
      transactionVolume: defaultTransactionVolume,

      // Loading & Error State
      isLoading: false,
      error: null,
      lastUpdated: null,

      // Actions
      fetchDashboardData: async () => {
        set({ isLoading: true, error: null });

        try {
          const stats = await getDashboardStats();

          set({
            totalClients: stats.totalClients,
            totalLoans: stats.totalLoans,
            outstandingBalance: stats.outstandingBalance,
            todayTransactions: stats.todayTransactions,
            loanTrends: stats.loanTrends.length > 0 ? stats.loanTrends : defaultLoanTrends,
            transactionVolume: stats.transactionVolume.length > 0 ? stats.transactionVolume : defaultTransactionVolume,
            isLoading: false,
            lastUpdated: new Date().toISOString(),
          });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : 'ไม่สามารถดึงข้อมูลแดชบอร์ดได้',
            isLoading: false,
          });
        }
      },

      setLoanTrends: (data) => {
        set({ loanTrends: data });
      },

      setTransactionVolume: (data) => {
        set({ transactionVolume: data });
      },
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        totalClients: state.totalClients,
        totalLoans: state.totalLoans,
        outstandingBalance: state.outstandingBalance,
        todayTransactions: state.todayTransactions,
        loanTrends: state.loanTrends,
        transactionVolume: state.transactionVolume,
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
