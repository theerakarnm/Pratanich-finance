import { useState, useEffect } from 'preact/hooks';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, AlertCircle, FileText, Settings, LogOut, AlertTriangle } from 'lucide-react';
import { LoanCard } from '@/components/LoanCard';
import { disconnectLineAccount } from '@/lib/api-client';
import apiClient from '@/lib/api-client';
import { useLiffStore } from '@/store';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

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
  useDocumentTitle('สรุปสินเชื่อ', '');

  const [, setLocation] = useLocation();
  const { initLiff, profile } = useLiffStore();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loanData, setLoanData] = useState<LoanSummaryResponse | null>(null);

  // Disconnect dialog state
  const [showDisconnectDialog, setShowDisconnectDialog] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

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

  // Handle disconnect
  const handleDisconnect = async () => {
    if (!profile?.userId) {
      setDisconnectError('ไม่พบข้อมูล LINE กรุณาลองใหม่อีกครั้ง');
      return;
    }

    setIsDisconnecting(true);
    setDisconnectError(null);

    try {
      await disconnectLineAccount(profile.userId);
      // Close dialog and redirect to connect page
      setShowDisconnectDialog(false);
      setLocation('/liff/connect');
    } catch (error: any) {
      setDisconnectError(error.message || 'ไม่สามารถยกเลิกการเชื่อมต่อได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsDisconnecting(false);
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl">Your Loan Summary</CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDisconnectDialog(true)}
              title="ตั้งค่า"
            >
              <Settings className="h-5 w-5 text-gray-500" />
            </Button>
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

      {/* Disconnect Confirmation Dialog */}
      <Dialog open={showDisconnectDialog} onOpenChange={setShowDisconnectDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <DialogTitle className="text-center">ยกเลิกการเชื่อมต่อ?</DialogTitle>
            <DialogDescription className="text-center">
              หากคุณยกเลิกการเชื่อมต่อ LINE กับบัญชีนี้ คุณจะไม่สามารถรับการแจ้งเตือนผ่าน LINE ได้ และจะต้องเชื่อมต่อใหม่อีกครั้งเพื่อเข้าถึงข้อมูล
            </DialogDescription>
          </DialogHeader>

          {disconnectError && (
            <Alert variant="destructive" className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{disconnectError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="flex flex-col gap-2 sm:flex-col">
            <Button
              variant="destructive"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="w-full"
            >
              {isDisconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังยกเลิก...
                </>
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  ยกเลิกการเชื่อมต่อ
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowDisconnectDialog(false)}
              disabled={isDisconnecting}
              className="w-full"
            >
              ยกเลิก
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
