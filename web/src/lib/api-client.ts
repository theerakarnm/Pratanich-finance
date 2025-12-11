import axios, { AxiosError } from 'axios';
import type { AxiosInstance } from 'axios';

// API Response interface matching the backend structure
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Custom API Error class
export class ApiError extends Error {
  code?: string;
  details?: any;
  status?: number;

  constructor(
    message: string,
    code?: string,
    details?: any,
    status?: number
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

// Create Axios instance with Better Auth configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // Enable sending cookies for Better Auth
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor to unwrap the ApiResponse and handle errors
apiClient.interceptors.response.use(
  (response) => {
    // Unwrap the response to return only the data field
    const apiResponse: ApiResponse = response.data;
    if (apiResponse.success && apiResponse.data !== undefined) {
      return { ...response, data: apiResponse.data };
    }
    return response;
  },
  (error: AxiosError<ApiResponse>) => {
    // Handle API error responses
    if (error.response?.data?.error) {
      const apiError = error.response.data.error;
      throw new ApiError(
        apiError.message,
        apiError.code,
        apiError.details,
        error.response.status
      );
    }

    // Handle network errors
    if (error.request && !error.response) {
      throw new ApiError(
        'Network error: Unable to reach the server',
        'NETWORK_ERROR',
        undefined,
        0
      );
    }

    // Handle other errors
    throw new ApiError(
      error.message || 'An unexpected error occurred',
      'UNKNOWN_ERROR',
      undefined,
      error.response?.status
    );
  }
);

// ============================================================================
// Users API
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string;
  createdAt: string;
  updatedAt: string;
  role?: string;
  banned?: boolean;
  banReason?: string;
  banExpires?: string;
}

export const getUsers = async (): Promise<User[]> => {
  const response = await apiClient.get('/api/users');
  return response.data;
};

export const getUserById = async (id: string): Promise<User> => {
  const response = await apiClient.get(`/api/users/${id}`);
  return response.data;
};

export const updateUser = async (id: string, data: Partial<User>): Promise<User> => {
  const response = await apiClient.patch(`/api/users/${id}`, data);
  return response.data;
};

// ============================================================================
// Clients API
// ============================================================================

export interface Client {
  id: string;
  citizen_id: string;
  title_name: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  mobile_number: string;
  email?: string | null;
  line_id?: string | null;
  line_user_id?: string | null;
  line_display_name?: string | null;
  line_picture_url?: string | null;
  connected_at?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface ClientsListResponse {
  data: Client[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetClientsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getClients = async (params?: GetClientsParams): Promise<ClientsListResponse> => {
  const response = await apiClient.get('/api/internal/clients', { params });
  return response.data;
};

export const getClientById = async (id: string): Promise<Client> => {
  const response = await apiClient.get(`/api/internal/clients/${id}`);
  return response.data;
};

export const createClient = async (data: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'deleted_at'>): Promise<Client> => {
  const response = await apiClient.post('/api/internal/clients', data);
  return response.data;
};

export const updateClient = async (id: string, data: Partial<Client>): Promise<Client> => {
  const response = await apiClient.put(`/api/internal/clients/${id}`, data);
  return response.data;
};

export const deleteClient = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/api/internal/clients/${id}`);
  return response.data;
};

// ============================================================================
// Loans API
// ============================================================================

export interface Loan {
  id: string;
  contract_number: string;
  client_id: string;
  loan_type: string;
  principal_amount: number;
  approved_amount: number;
  interest_rate: number;
  term_months: number;
  installment_amount: number;
  contract_start_date: string;
  contract_end_date: string;
  due_day: number;
  contract_status: 'Active' | 'Closed' | 'Overdue';
  outstanding_balance: number;
  overdue_days: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  client?: {
    first_name: string;
    last_name: string;
    citizen_id: string;
  };
}

export interface LoansListResponse {
  data: Loan[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetLoansParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getLoans = async (params?: GetLoansParams): Promise<LoansListResponse> => {
  const response = await apiClient.get('/api/internal/loans', { params });
  return response.data;
};

export const getLoanById = async (id: string): Promise<Loan> => {
  const response = await apiClient.get(`/api/internal/loans/${id}`);
  return response.data;
};

export const createLoan = async (data: Omit<Loan, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'client'>): Promise<Loan> => {
  const response = await apiClient.post('/api/internal/loans', data);
  return response.data;
};

export const updateLoan = async (id: string, data: Partial<Loan>): Promise<Loan> => {
  const response = await apiClient.put(`/api/internal/loans/${id}`, data);
  return response.data;
};

export const deleteLoan = async (id: string): Promise<{ message: string }> => {
  const response = await apiClient.delete(`/api/internal/loans/${id}`);
  return response.data;
};

// ============================================================================
// SlipOK API
// ============================================================================

export interface VerifySlipParams {
  data?: string;
  files?: string; // base64
  url?: string;
  amount?: number;
  log?: boolean;
}

export const verifySlip = async (params: VerifySlipParams) => {
  const response = await apiClient.post('/api/slipok/verify', params);
  return response.data;
};

export const getSlipQuota = async () => {
  const response = await apiClient.get('/api/slipok/quota');
  return response.data;
};

export interface SlipOKLogSender {
  displayName: string;
  name: string;
  proxy: { type: string | null; value: string | null };
  account: { type: string; value: string };
}

export interface SlipOKLog {
  id: string;
  transRef: string;
  sendingBank: string;
  receivingBank: string;
  transDate: string;
  transTime: string;
  amount: string;
  sender: SlipOKLogSender;
  receiver: SlipOKLogSender;
  success: boolean;
  message?: string;
  created_at: string;
}

export interface SlipOKLogsListResponse {
  data: SlipOKLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GetSlipOKLogsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const getSlipOKLogs = async (params?: GetSlipOKLogsParams): Promise<SlipOKLogsListResponse> => {
  const response = await apiClient.get('/api/slipok/logs', { params });
  return response.data;
};

// ============================================================================
// Connect Code API
// ============================================================================

export interface GenerateConnectCodeResponse {
  code: string;
  expiresAt: string;
  clientId: string;
}

export const generateConnectCode = async (clientId: string): Promise<GenerateConnectCodeResponse> => {
  const response = await apiClient.post(`/api/internal/clients/${clientId}/connect-code`);
  return response.data;
};

export interface VerifyConnectCodeRequest {
  code: string;
}

export interface VerifyConnectCodeResponse {
  valid: boolean;
  clientId?: string;
  error?: string;
}

export const verifyConnectCode = async (data: VerifyConnectCodeRequest): Promise<VerifyConnectCodeResponse> => {
  const response = await apiClient.post('/api/connect/verify', data);
  return response.data;
};

export interface CompleteConnectionRequest {
  code: string;
  lineUserId: string;
  lineDisplayName: string;
  linePictureUrl?: string;
}

export interface CompleteConnectionResponse {
  success: boolean;
  clientId: string;
  hasLoans: boolean;
}

export const completeConnection = async (data: CompleteConnectionRequest): Promise<CompleteConnectionResponse> => {
  const response = await apiClient.post('/api/connect/complete', data);
  return response.data;
};

export interface ClientByLineUserIdResponse {
  clientId: string;
  firstName: string;
  lastName: string;
  connectedAt: string;
}

export const getClientByLineUserId = async (lineUserId: string): Promise<ClientByLineUserIdResponse> => {
  const response = await apiClient.get(`/api/connect/client/${lineUserId}`);
  return response.data;
};

export interface LoanSummary {
  id: string;
  contractNumber: string;
  loanType: string;
  principalAmount: string;
  outstandingBalance: string;
  contractStatus: 'Active' | 'Closed' | 'Overdue';
  contractStartDate: string;
  contractEndDate: string;
  dueDay: number;
  overduedays: number;
}

export interface LoanSummaryResponse {
  loans: LoanSummary[];
  totalLoans: number;
  totalOutstanding: string;
}

export const getClientLoansSummary = async (clientId: string): Promise<LoanSummaryResponse> => {
  const response = await apiClient.get(`/api/clients/${clientId}/loans/summary`);
  return response.data;
};

// ============================================================================
// Dashboard API
// ============================================================================

export interface DashboardStatsResponse {
  totalClients: number;
  totalLoans: number;
  outstandingBalance: number;
  todayTransactions: number;
  loanTrends: Array<{ name: string; value: number }>;
  transactionVolume: Array<{ name: string; value: number }>;
}

export const getDashboardStats = async (): Promise<DashboardStatsResponse> => {
  const response = await apiClient.get('/api/dashboard/stats');
  return response.data;
};

// ============================================================================
// LINE Disconnect API
// ============================================================================

export interface DisconnectLineResponse {
  success: boolean;
  message: string;
}

export const disconnectLineAccount = async (lineUserId: string): Promise<DisconnectLineResponse> => {
  const response = await apiClient.delete(`/api/connect/disconnect/${lineUserId}`);
  return response.data;
};

// Export the configured axios instance for custom requests
export default apiClient;
