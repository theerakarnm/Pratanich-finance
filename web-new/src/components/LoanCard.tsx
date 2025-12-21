import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, TrendingUp, AlertCircle, History as HistoryIcon } from 'lucide-react';
import dayjs from 'dayjs';

interface LoanCardProps {
  loan: {
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
  };
}

export function LoanCard({ loan }: LoanCardProps) {
  // Format currency
  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('th-TH', {
      style: 'currency',
      currency: 'THB',
      minimumFractionDigits: 2,
    }).format(numAmount);
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'default';
      case 'Closed':
        return 'secondary';
      case 'Overdue':
        return 'destructive';
      default:
        return 'default';
    }
  };

  // Get status color for visual indicator
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-500';
      case 'Closed':
        return 'bg-gray-500';
      case 'Overdue':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Translate status to Thai
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'Active':
        return 'ใช้งานอยู่';
      case 'Closed':
        return 'ปิดสัญญา';
      case 'Overdue':
        return 'ค้างชำระ';
      default:
        return status;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">
              {loan.contractNumber}
            </CardTitle>
            {/* <p className="text-sm text-gray-500 mt-1">{loan.loanType}</p> */}
          </div>
          <Badge variant={getStatusVariant(loan.contractStatus)}>
            {getStatusLabel(loan.contractStatus)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status indicator bar */}
        <div className="flex items-center gap-2">
          <div className={`h-1 flex-1 rounded-full ${getStatusColor(loan.contractStatus)}`} />
        </div>

        {/* Overdue warning */}
        {loan.contractStatus === 'Overdue' && loan.overduedays > 0 && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm font-medium">
              ค้างชำระ {loan.overduedays} วัน
            </p>
          </div>
        )}

        {/* Loan amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <CreditCard className="h-4 w-4" />
              <p className="text-xs">เงินต้น</p>
            </div>
            <p className="text-lg font-semibold">
              {formatCurrency(loan.principalAmount)}
            </p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-gray-500">
              <TrendingUp className="h-4 w-4" />
              <p className="text-xs">ยอดคงเหลือ</p>
            </div>
            <p className="text-lg font-semibold text-orange-600">
              {formatCurrency(loan.outstandingBalance)}
            </p>
          </div>
        </div>

        {/* Contract dates */}
        <div className="space-y-2 rounded-lg bg-gray-50 p-3">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>วันเริ่มสัญญา</span>
            </div>
            <span className="font-medium">
              {dayjs(loan.contractStartDate).format('DD MMM YYYY')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1.5 text-gray-600">
              <Calendar className="h-3.5 w-3.5" />
              <span>วันสิ้นสุดสัญญา</span>
            </div>
            <span className="font-medium">
              {dayjs(loan.contractEndDate).format('DD MMM YYYY')}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">วันครบกำหนดชำระ</span>
            <span className="font-medium">วันที่ {loan.dueDay} ของทุกเดือน</span>
          </div>
        </div>

        <Button
          className="w-full"
          variant="outline"
          onClick={() => window.location.href = `/liff/loans/${loan.id}/payments`}
        >
          <HistoryIcon className="mr-2 h-4 w-4" />
          ดูประวัติการชำระเงิน
        </Button>
      </CardContent>
    </Card>
  );
}
