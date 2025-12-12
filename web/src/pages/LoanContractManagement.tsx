import { useEffect } from 'preact/hooks';
import { useLoansStore } from '@/store';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Link } from 'wouter';
import { ChevronLeft, ChevronRight, Edit, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from '@/lib/formatter';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export function LoanContractManagement() {
  useDocumentTitle('จัดการสัญญาเงินกู้');

  // Use Zustand store
  const {
    loans,
    totalPages,
    total,
    searchTerm,
    currentPage,
    showDeleteDialog,
    loanToDelete,
    isLoading,
    error,
    setSearchTerm,
    setCurrentPage,
    setShowDeleteDialog,
    setLoanToDelete,
    fetchLoans,
    deleteLoanById,
  } = useLoansStore();

  // Initial fetch
  useEffect(() => {
    fetchLoans();
  }, []);

  // Debounced search effect
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchLoans();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Fetch on page change
  useEffect(() => {
    fetchLoans();
  }, [currentPage]);

  const handleDeleteClick = (loan: typeof loans[0]) => {
    setLoanToDelete(loan);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!loanToDelete) return;
    await deleteLoanById(loanToDelete.id);
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setLoanToDelete(null);
  };

  if (isLoading && loans.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">จัดการสัญญาเงินกู้</h1>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <Input
              placeholder="ค้นหาสัญญา..."
              value={searchTerm}
              onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
              className="w-full md:w-[300px]"
            />
            <Link href="/admin/loans/new">
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                สร้างสัญญา
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-muted-foreground">กำลังโหลดข้อมูลสัญญาเงินกู้...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">จัดการสัญญาเงินกู้</h1>
          <p className="text-sm text-muted-foreground">ทั้งหมด {total} สัญญา</p>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Input
            placeholder="ค้นหาสัญญา..."
            value={searchTerm}
            onInput={(e) => setSearchTerm((e.target as HTMLInputElement).value)}
            className="w-full md:w-[300px]"
          />
          <Link href="/admin/loans/new">
            <Button className="w-full md:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              สร้างสัญญา
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4">
          <div className="text-sm text-red-800">ข้อผิดพลาด: {error}</div>
        </div>
      )}

      <div className="rounded-md border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>เลขที่สัญญา</TableHead>
              <TableHead>ชื่อลูกค้า</TableHead>
              <TableHead>เลขบัตรประชาชน</TableHead>
              <TableHead>ประเภทเงินกู้</TableHead>
              <TableHead>จำนวนเงินต้น</TableHead>
              <TableHead>วันเริ่มต้น</TableHead>
              <TableHead>สถานะ</TableHead>
              <TableHead>ยอดคงเหลือ</TableHead>
              <TableHead className="text-right">การกระทำ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">กำลังโหลด...</div>
                </TableCell>
              </TableRow>
            ) : loans.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="text-sm text-muted-foreground">
                    {searchTerm ? 'ไม่พบสัญญาที่ตรงกับการค้นหาของคุณ' : 'ไม่มีข้อมูลสัญญาเงินกู้'}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              loans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.contract_number}</TableCell>
                  <TableCell>
                    {loan.client ? `${loan.client.first_name} ${loan.client.last_name}` : '-'}
                  </TableCell>
                  <TableCell>
                    {loan.client ? loan.client.citizen_id : '-'}
                  </TableCell>
                  <TableCell>{loan.loan_type}</TableCell>
                  <TableCell className='text-right'>{formatCurrency(loan.principal_amount)}</TableCell>
                  <TableCell>{loan.contract_start_date}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${loan.contract_status === 'Active' ? 'bg-green-100 text-green-800' :
                      loan.contract_status === 'Closed' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                      {loan.contract_status}
                    </span>
                  </TableCell>
                  <TableCell className='text-right'>{formatCurrency(loan.outstanding_balance)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/loans/${loan.id}/edit`}>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(loan)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบสัญญาเงินกู้</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือไม่ว่าต้องการลบสัญญาเงินกู้ {loanToDelete?.contract_number}?
              การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
