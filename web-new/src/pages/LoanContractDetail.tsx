import { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Percent,
  Clock,
  AlertCircle,
  User,
  FileText,
  TrendingUp,
  Banknote,
  Calculator,
  Loader2,
  Phone,
  Check,
  X,
  Pencil,
  MessageSquare,
  Send,
} from 'lucide-react';
import { formatCurrency } from '@/lib/formatter';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import apiClient from '@/lib/api-client';
import dayjs from 'dayjs';
import { toast } from 'sonner';

interface PaymentPeriod {
  periodNumber: number;
  paymentDate: string;
  beginningBalance: number;
  scheduledPayment: number;
  principalPayment: number;
  interestPayment: number;
  endingBalance: number;
  accumulatedInterest: number;
  isPaid: boolean;
  status: 'paid' | 'current' | 'upcoming';
  penaltyPayment?: number;
  paymentMethod?: string;
  transactionRef?: string;
}

interface LoanDetails {
  id: string;
  contractNumber: string;
  clientName: string;
  loanType: string;
  principalAmount: number;
  approvedAmount: number;
  interestRate: number;
  termMonths: number;
  installmentAmount: number;
  contractStartDate: string;
  contractEndDate: string;
  dueDay: number;
  contractStatus: string;
  outstandingBalance: number;
  principalPaid: number;
  interestPaid: number;
  totalPenalties: number;
  penaltiesPaid: number;
  overduedays: number;
  collectionFee: number;
}

interface LoanSummary {
  totalPaymentAmount: number;
  totalInterest: number;
  totalPrincipal: number;
  remainingPayments: number;
  completedPayments: number;
}

interface PaymentScheduleResponse {
  loanDetails: LoanDetails;
  summary: LoanSummary;
  schedule: PaymentPeriod[];
}

export function LoanContractDetail() {
  const [, params] = useRoute('/admin/loans/:id');
  const loanId = params?.id;

  useDocumentTitle('รายละเอียดสัญญาเงินกู้');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaymentScheduleResponse | null>(null);

  // Collection fee inline edit state
  const [isEditingCollectionFee, setIsEditingCollectionFee] = useState(false);
  const [collectionFeeAmount, setCollectionFeeAmount] = useState('');
  const [isUpdatingFee, setIsUpdatingFee] = useState(false);

  // LINE message sending state
  const [sendingMessageType, setSendingMessageType] = useState<string | null>(null);

  useEffect(() => {
    if (loanId) {
      fetchLoanSchedule();
    }
  }, [loanId]);

  const fetchLoanSchedule = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.get<PaymentScheduleResponse>(
        `/api/internal/loans/${loanId}/schedule`
      );
      setData(response.data);
    } catch (error: any) {
      setError(error.message || 'ไม่สามารถโหลดข้อมูลสัญญาได้');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-green-500 hover:bg-green-600">ใช้งาน</Badge>;
      case 'Closed':
        return <Badge variant="secondary">ปิดบัญชี</Badge>;
      case 'Overdue':
        return <Badge variant="destructive">ค้างชำระ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStartEditCollectionFee = () => {
    setCollectionFeeAmount(data?.loanDetails.collectionFee?.toString() || '0');
    setIsEditingCollectionFee(true);
  };

  const handleCancelEditCollectionFee = () => {
    setIsEditingCollectionFee(false);
    setCollectionFeeAmount('');
  };

  const handleUpdateCollectionFee = async () => {
    if (!loanId) return;

    const amount = parseFloat(collectionFeeAmount);
    if (isNaN(amount) || amount < 0) {
      toast.error('กรุณากรอกจำนวนเงินที่ถูกต้อง');
      return;
    }

    setIsUpdatingFee(true);
    try {
      await apiClient.patch(`/api/internal/loans/${loanId}/collection-fee`, {
        amount: amount,
      });
      toast.success('บันทึกค่าทวงถามเรียบร้อยแล้ว');
      setIsEditingCollectionFee(false);
      fetchLoanSchedule(); // Refresh data
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถบันทึกค่าทวงถามได้');
    } finally {
      setIsUpdatingFee(false);
    }
  };

  const handleSendLineMessage = async (messageType: string) => {
    if (!loanId || sendingMessageType) return;

    setSendingMessageType(messageType);
    try {
      await apiClient.post(`/api/internal/loans/${loanId}/send-message`, {
        messageType,
      });
      toast.success('ส่งข้อความสำเร็จ');
    } catch (error: any) {
      toast.error(error.message || 'ไม่สามารถส่งข้อความได้');
    } finally {
      setSendingMessageType(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48 mt-2" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Link href="/admin/loans">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">รายละเอียดสัญญาเงินกู้</h1>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>เกิดข้อผิดพลาด</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { loanDetails, summary, schedule } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/loans">
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                {loanDetails.contractNumber}
              </h1>
              {getStatusBadge(loanDetails.contractStatus)}
            </div>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <User className="h-4 w-4" />
              {loanDetails.clientName}
              <span className="text-gray-300">•</span>
              <FileText className="h-4 w-4" />
              {loanDetails.loanType}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/loans/${loanId}/edit`}>
            <Button variant="outline">แก้ไขสัญญา</Button>
          </Link>
        </div>
      </div>

      {/* Loan Info Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Loan Input Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              ข้อมูลสัญญาเงินกู้
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">จำนวนเงินกู้</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(loanDetails.principalAmount)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">อัตราดอกเบี้ยรายปี</p>
                <p className="text-xl font-bold flex items-center gap-1">
                  <Percent className="h-4 w-4 text-muted-foreground" />
                  {loanDetails.interestRate}%
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">จำนวนงวด</p>
                <p className="text-lg font-semibold">{loanDetails.termMonths} งวด</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ค่างวดต่อเดือน</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(loanDetails.installmentAmount)}
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  วันเริ่มต้นสัญญา
                </span>
                <span className="font-medium">
                  {dayjs(loanDetails.contractStartDate).format('DD/MM/YYYY')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  วันสิ้นสุดสัญญา
                </span>
                <span className="font-medium">
                  {dayjs(loanDetails.contractEndDate).format('DD/MM/YYYY')}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  วันครบกำหนดชำระ
                </span>
                <span className="font-medium">วันที่ {loanDetails.dueDay} ของทุกเดือน</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loan Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              สรุปเงินกู้
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ยอดที่ต้องชำระทั้งหมด</p>
                <p className="text-xl font-bold">
                  {formatCurrency(summary.totalPaymentAmount)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ดอกเบี้ยทั้งหมด</p>
                <p className="text-xl font-bold text-orange-600">
                  {formatCurrency(summary.totalInterest)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">ยอดคงเหลือ</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatCurrency(loanDetails.outstandingBalance)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">งวดที่เหลือ</p>
                <p className="text-lg font-semibold">
                  {summary.remainingPayments} / {loanDetails.termMonths} งวด
                </p>
              </div>
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" />
                  เงินต้นที่ชำระแล้ว
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(loanDetails.principalPaid)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  ดอกเบี้ยที่ชำระแล้ว
                </span>
                <span className="font-medium text-green-600">
                  {formatCurrency(loanDetails.interestPaid)}
                </span>
              </div>
              {loanDetails.totalPenalties > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    ค่าปรับค้างชำระ
                  </span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(loanDetails.totalPenalties - loanDetails.penaltiesPaid)}
                  </span>
                </div>
              )}

              {/* Collection Fee Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    ค่าทวงถาม
                  </span>
                  {!isEditingCollectionFee && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-orange-600">
                        {formatCurrency(loanDetails.collectionFee || 0)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2"
                        onClick={handleStartEditCollectionFee}
                      >
                        <Pencil className="h-3 w-3 mr-1" />
                        แก้ไข
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingCollectionFee && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="h-8 w-32"
                      value={collectionFeeAmount}
                      onChange={(e) => setCollectionFeeAmount((e.target as HTMLInputElement).value)}
                      disabled={isUpdatingFee}
                    />
                    <span className="text-sm text-muted-foreground">บาท</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={handleCancelEditCollectionFee}
                      disabled={isUpdatingFee}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 px-2"
                      onClick={handleUpdateCollectionFee}
                      disabled={isUpdatingFee}
                    >
                      {isUpdatingFee ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LINE Message Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            ส่งข้อความ LINE
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendLineMessage('newLoan')}
              disabled={sendingMessageType !== null}
            >
              {sendingMessageType === 'newLoan' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              แจ้งสัญญาใหม่
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendLineMessage('billing')}
              disabled={sendingMessageType !== null}
            >
              {sendingMessageType === 'billing' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              แจ้งยอดชำระ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendLineMessage('dueWarning')}
              disabled={sendingMessageType !== null}
            >
              {sendingMessageType === 'dueWarning' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              เตือนใกล้ครบกำหนด
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendLineMessage('dueDate')}
              disabled={sendingMessageType !== null}
            >
              {sendingMessageType === 'dueDate' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              แจ้งวันครบกำหนด
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSendLineMessage('overdue')}
              disabled={sendingMessageType !== null}
            >
              {sendingMessageType === 'overdue' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              แจ้งค้างชำระ
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment Schedule Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            ประวัติการชำระเงิน
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="text-center w-16">ครั้งที่</TableHead>
                  <TableHead className="text-center">วันที่ชำระ</TableHead>
                  <TableHead className="text-right">ยอดก่อนชำระ</TableHead>
                  <TableHead className="text-right">ยอดชำระ</TableHead>
                  <TableHead className="text-right">เงินต้น</TableHead>
                  <TableHead className="text-right">ดอกเบี้ย</TableHead>
                  <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                  <TableHead className="text-right">ดอกเบี้ยสะสม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      ยังไม่มีประวัติการชำระเงิน
                    </TableCell>
                  </TableRow>
                ) : (
                  schedule.map((period, index) => (
                    <TableRow
                      key={period.periodNumber}
                      className={index % 2 === 0 ? 'bg-green-50/50 dark:bg-green-900/10' : ''}
                    >
                      <TableCell className="text-center font-medium">
                        {period.periodNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        {dayjs(period.paymentDate).format('DD/MM/YYYY')}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(period.beginningBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(period.scheduledPayment)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-blue-600">
                        {formatCurrency(period.principalPayment)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-orange-600">
                        {formatCurrency(period.interestPayment)}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">
                        {formatCurrency(period.endingBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {formatCurrency(period.accumulatedInterest)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Summary Footer */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-6 justify-center md:justify-end text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span>ชำระแล้ว: {summary.completedPayments} ครั้ง</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span>งวดที่เหลือ: {summary.remainingPayments} งวด</span>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}
