import { useEffect, useCallback } from 'preact/hooks';
import { useTransactionsStore } from '@/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Eye, Loader2 } from "lucide-react";
import { TransactionDetail } from "@/components/transaction-detail";
import { formatCurrency } from '@/lib/formatter';
import { SlipVerificationModal } from "@/components/slip-verification-modal";

export function Transaction() {
  // Use Zustand store
  const {
    transactions,
    totalPages,
    searchTerm,
    currentPage,
    selectedTransaction,
    showVerifyModal,
    isLoading,
    error,
    setSearchTerm,
    setCurrentPage,
    setSelectedTransaction,
    setShowVerifyModal,
    fetchTransactions,
  } = useTransactionsStore();

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTransactions();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch on page change
  useEffect(() => {
    fetchTransactions();
  }, [currentPage]);

  // Initial fetch
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Handle verify modal close and refetch
  const handleVerifyModalClose = useCallback((open: boolean) => {
    setShowVerifyModal(open);
    if (!open) {
      fetchTransactions();
    }
  }, [setShowVerifyModal, fetchTransactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">รายการทำรายการ</h1>
        <div className="flex flex-col gap-2 md:flex-row md:items-center w-full md:w-auto">
          <Input
            placeholder="ค้นหาเลขอ้างอิง, ผู้ส่ง, จำนวนเงิน..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="w-full md:max-w-sm"
          />
        </div>
      </div>

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>วันที่/เวลา</TableHead>
              <TableHead>เลขที่อ้างอิง</TableHead>
              <TableHead>ผู้ส่ง</TableHead>
              <TableHead>ผู้รับ</TableHead>
              <TableHead>จำนวนเงิน</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead className="text-right">การกระทำ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>กำลังโหลด...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-red-500">
                  {error}
                </TableCell>
              </TableRow>
            ) : transactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  ไม่พบรายการ
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{t.transDate}</span>
                      <span className="text-xs text-muted-foreground">{t.transTime}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{t.transRef}</TableCell>
                  <TableCell>{t.sender?.displayName || t.sender?.name || '-'}</TableCell>
                  <TableCell>{t.receiver?.displayName || t.receiver?.name || '-'}</TableCell>
                  <TableCell className='text-right'>{formatCurrency(parseFloat(t.amount))}</TableCell>
                  <TableCell>
                    <Badge variant={t.success ? "default" : "destructive"}>
                      {t.success ? "Success" : "Failed"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedTransaction(t)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || isLoading}
        >
          <ChevronLeft className="h-4 w-4" />
          ก่อนหน้า
        </Button>
        <div className="text-sm text-muted-foreground">
          หน้า {currentPage} จาก {totalPages}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || isLoading}
        >
          ถัดไป
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={!!selectedTransaction} onOpenChange={(open) => {
        if (!open) setSelectedTransaction(null);
      }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>รายละเอียดรายการ</DialogTitle>
            <DialogDescription>
              เลขที่อ้างอิง: {selectedTransaction?.transRef}
            </DialogDescription>
          </DialogHeader>
          {selectedTransaction && <TransactionDetail transaction={selectedTransaction} />}
        </DialogContent>
      </Dialog>

      <SlipVerificationModal open={showVerifyModal} onOpenChange={handleVerifyModalClose} />
    </div >
  );
}
