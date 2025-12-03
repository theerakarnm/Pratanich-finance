import { useState, useEffect } from 'preact/hooks';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, ArrowLeft, Calendar, CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';
import { useLocation } from 'wouter';

interface Payment {
  id: string;
  transaction_ref_id: string;
  payment_date: string;
  amount: string;
  transaction_status: 'Pending' | 'Completed' | 'Failed' | 'Reversed';
  transaction_type: string;
}

interface LiffPaymentHistoryProps {
  loanId: string;
}

export function LiffPaymentHistory({ loanId }: LiffPaymentHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [_, __] = useLocation();

  useEffect(() => {
    fetchPaymentHistory();
  }, [loanId]);

  const fetchPaymentHistory = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Using the existing API endpoint: /api/payments/history/:loanId
      const response = await apiClient.get<Payment[]>(
        `/api/payments/history/${loanId}`
      );
      setPayments(response.data);
    } catch (error: any) {
      if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to load payment history. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>;
      case 'Pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600">Pending</Badge>;
      case 'Failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'Reversed':
        return <Badge variant="secondary">Reversed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'Pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'Failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <CreditCard className="h-5 w-5 text-gray-400" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-2 text-sm text-gray-600">Loading payment history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading History</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-8">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="-ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-gray-900">Payment History</h1>
        </div>

        {payments.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="rounded-full bg-gray-100 p-4 mb-4">
                <CreditCard className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No Payments Found
              </h3>
              <p className="text-sm text-gray-500 text-center">
                There are no payment records for this loan yet.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {payments.map((payment) => (
              <Card key={payment.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getStatusIcon(payment.transaction_status)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {payment.transaction_type}
                        </p>
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>
                            {dayjs(payment.payment_date).format('DD MMM YYYY, HH:mm')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Ref: {payment.transaction_ref_id}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${payment.transaction_type === 'Payment' ? 'text-green-600' : 'text-gray-900'
                        }`}>
                        {payment.transaction_type === 'Payment' ? '-' : '+'}
                        {formatCurrency(payment.amount)}
                      </p>
                      <div className="mt-2">
                        {getStatusBadge(payment.transaction_status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
