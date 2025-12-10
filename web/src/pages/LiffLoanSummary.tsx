import { useState, useEffect } from 'preact/hooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, FileText } from 'lucide-react';
import { LoanCard } from '@/components/LoanCard';
import apiClient from '@/lib/api-client';
import { useLiffStore } from '@/store';

interface LoanSummary {
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

interface LoanSummaryResponse {
  loans: LoanSummary[];
  totalLoans: number;
  totalOutstanding: string;
}

interface LiffLoanSummaryProps {
  clientId: string;
}

export function LiffLoanSummary({ clientId }: LiffLoanSummaryProps) {
  const { initLiff } = useLiffStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loanData, setLoanData] = useState<LoanSummaryResponse | null>(null);

  useEffect(() => {
    initLiff();
    fetchLoanSummary();
  }, [clientId]);

  const fetchLoanSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<LoanSummaryResponse>(
        `/api/internal/clients/${clientId}/loans/summary`
      );
      setLoanData(response.data);
    } catch (error: any) {
      if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to load loan information. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-600">Loading your loan information...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Loans</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  // No loans state
  if (!loanData || loanData.loans.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Active Loans
            </h3>
            <p className="text-sm text-gray-500 text-center">
              You don't have any loan contracts at the moment.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Loans display
  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-8">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header with summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Your Loan Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total Loans</p>
                <p className="text-2xl font-bold">{loanData.totalLoans}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Total Outstanding</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(loanData.totalOutstanding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loan cards */}
        <div className="space-y-4">
          {loanData.loans.map((loan) => (
            <LoanCard key={loan.id} loan={loan} />
          ))}
        </div>
      </div>
    </div>
  );
}
