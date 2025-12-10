import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getClients, getLoans } from '@/lib/api-client';

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

// Default chart data
const defaultLoanTrends = [
  { name: 'Jan', value: 4000 },
  { name: 'Feb', value: 3000 },
  { name: 'Mar', value: 2000 },
  { name: 'Apr', value: 2780 },
  { name: 'May', value: 1890 },
  { name: 'Jun', value: 2390 },
];

const defaultTransactionVolume = [
  { name: 'Mon', value: 2400 },
  { name: 'Tue', value: 1398 },
  { name: 'Wed', value: 9800 },
  { name: 'Thu', value: 3908 },
  { name: 'Fri', value: 4800 },
  { name: 'Sat', value: 3800 },
  { name: 'Sun', value: 4300 },
];

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
          const [clientsResponse, loansResponse] = await Promise.all([
            getClients({ limit: 1 }),
            getLoans({ limit: 1000 }),
          ]);

          const totalOutstanding = loansResponse.data.reduce(
            (acc, loan) => acc + loan.outstanding_balance,
            0
          );

          set({
            totalClients: clientsResponse.meta.total,
            totalLoans: loansResponse.meta.total,
            outstandingBalance: totalOutstanding,
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
        lastUpdated: state.lastUpdated,
      }),
    }
  )
);
